import Foundation
import SwiftData

// MARK: Wire payload (mirrors web/app/api/sync-progress/route.ts)

private struct SyncPayload: Encodable, Sendable {
    let attempts: [AttemptDTO]
    let session: SessionDTO?

    struct AttemptDTO: Encodable, Sendable {
        let questionId: String
        let answer: String
        let correct: Bool
        let timestamp: Int64
        let localSessionId: String?
    }

    struct SessionDTO: Encodable, Sendable {
        let localId: String
        let kind: String
        let source: SourceDTO?
        let startedAt: Int64
        let completedAt: Int64?
        let questionCount: Int
        let correctCount: Int?
    }

    struct SourceDTO: Encodable, Sendable {
        let kind: String
        let examCode: String?
        let category: String?
    }
}

private struct SyncResponse: Decodable, Sendable {
    let inserted: Int
    let sessionId: String?
}

// MARK: Snapshots (Sendable copies of @Model rows for cross-actor passing)

struct AttemptSnapshot: Sendable {
    let clientId: String
    let questionId: String
    let answer: String
    let correct: Bool
    let attemptedAt: Date
    let sessionClientId: String?
}

struct SessionSnapshot: Sendable {
    let clientId: String
    let kind: String
    let sourceKind: String
    let sourceExamCode: String?
    let sourceCategory: String?
    let startedAt: Date
    let completedAt: Date?
    let questionCount: Int
    let correctCount: Int?
}

// MARK: SyncEngine

/// Local-first attempt sync. Whenever someone calls `kick()`, we wait a few
/// seconds (debounce — coalesces a rapid burst of answers into one request)
/// then flush every Attempt row whose `syncedAt` is nil. On 200, mark them
/// synced. On error, leave them and try again on the next kick.
///
/// The server-side dedup key `(user_id, question_id, attempted_at)` makes
/// retries safe — duplicate rows are silently dropped.
actor SyncEngine {
    static let shared = SyncEngine()

    private let debounceNs: UInt64 = 4_000_000_000  // 4 s
    private var pendingTask: Task<Void, Never>?

    private init() {}

    /// Schedule a flush. Multiple calls within the debounce window collapse
    /// to a single request. Safe to call from any actor.
    func kick(modelContainer: ModelContainer) {
        pendingTask?.cancel()
        pendingTask = Task { [weak self] in
            guard let self else { return }
            try? await Task.sleep(nanoseconds: self.debounceNs)
            if Task.isCancelled { return }
            await self.flush(modelContainer: modelContainer)
        }
    }

    /// Force an immediate flush, bypassing the debounce. Call on app
    /// foreground / sign-in / session completion.
    func flushNow(modelContainer: ModelContainer) async {
        pendingTask?.cancel()
        await flush(modelContainer: modelContainer)
    }

    private func flush(modelContainer: ModelContainer) async {
        guard await AuthClient.shared.accessToken() != nil else { return }

        let pending: ([AttemptSnapshot], SessionSnapshot?)
        do {
            pending = try await BackgroundContext(modelContainer: modelContainer)
                .readPending()
        } catch {
            print("[SyncEngine] read pending failed: \(error)")
            return
        }
        let (attempts, session) = pending
        guard !attempts.isEmpty || session != nil else { return }

        let payload = SyncPayload(
            attempts: attempts.map { snap in
                .init(
                    questionId: snap.questionId,
                    answer: snap.answer,
                    correct: snap.correct,
                    timestamp: Int64(snap.attemptedAt.timeIntervalSince1970 * 1000),
                    localSessionId: snap.sessionClientId,
                )
            },
            session: session.map { s in
                .init(
                    localId: s.clientId,
                    kind: s.kind,
                    source: .init(
                        kind: s.sourceKind,
                        examCode: s.sourceExamCode,
                        category: s.sourceCategory,
                    ),
                    startedAt: Int64(s.startedAt.timeIntervalSince1970 * 1000),
                    completedAt: s.completedAt.map {
                        Int64($0.timeIntervalSince1970 * 1000)
                    },
                    questionCount: s.questionCount,
                    correctCount: s.correctCount,
                )
            },
        )

        let response: SyncResponse
        do {
            response = try await APIClient.shared.post(
                "/api/sync-progress", body: payload, as: SyncResponse.self,
            )
        } catch {
            print("[SyncEngine] flush failed: \(error)")
            return
        }

        do {
            try await BackgroundContext(modelContainer: modelContainer).markSynced(
                attemptClientIds: attempts.map(\.clientId),
                sessionClientId: session?.clientId,
                serverSessionId: response.sessionId,
            )
        } catch {
            print("[SyncEngine] post-flush update failed: \(error)")
        }
    }
}

// MARK: ModelActor wrapper

@ModelActor
actor BackgroundContext {
    func readPending() throws -> ([AttemptSnapshot], SessionSnapshot?) {
        let attemptDescriptor = FetchDescriptor<Attempt>(
            predicate: #Predicate { $0.syncedAt == nil },
            sortBy: [SortDescriptor(\.attemptedAt)],
        )
        let attempts = try modelContext.fetch(attemptDescriptor)
        let snapshots = attempts.prefix(100).map {
            AttemptSnapshot(
                clientId: $0.clientId,
                questionId: $0.questionId,
                answer: $0.answer,
                correct: $0.correct,
                attemptedAt: $0.attemptedAt,
                sessionClientId: $0.sessionClientId,
            )
        }

        // Most recent unsynced session that any pending attempt belongs to.
        let overlappingId = snapshots.compactMap(\.sessionClientId).first
        var session: SessionSnapshot? = nil
        if let target = overlappingId {
            let descriptor = FetchDescriptor<StudySession>(
                predicate: #Predicate { $0.clientId == target },
            )
            if let s = try modelContext.fetch(descriptor).first {
                session = SessionSnapshot(
                    clientId: s.clientId,
                    kind: s.kindRaw,
                    sourceKind: s.sourceKind,
                    sourceExamCode: s.sourceExamCode,
                    sourceCategory: s.sourceCategory,
                    startedAt: s.startedAt,
                    completedAt: s.completedAt,
                    questionCount: s.questionCount,
                    correctCount: s.correctCount,
                )
            }
        }
        return (Array(snapshots), session)
    }

    func markSynced(
        attemptClientIds: [String],
        sessionClientId: String?,
        serverSessionId: String?,
    ) throws {
        let now = Date.now
        for cid in attemptClientIds {
            let descriptor = FetchDescriptor<Attempt>(
                predicate: #Predicate { $0.clientId == cid },
            )
            if let row = try modelContext.fetch(descriptor).first {
                row.syncedAt = now
            }
        }
        if let cid = sessionClientId, let serverId = serverSessionId {
            let descriptor = FetchDescriptor<StudySession>(
                predicate: #Predicate { $0.clientId == cid },
            )
            if let row = try modelContext.fetch(descriptor).first {
                row.serverId = serverId
            }
        }
        try modelContext.save()
    }
}
