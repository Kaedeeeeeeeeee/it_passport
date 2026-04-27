import Foundation

/// Review-mode candidate selection. Mirrors `web/lib/review.ts` so the iOS
/// and web apps surface the same questions for "review" sessions.
enum Review {
    enum Strategy: String, CaseIterable, Sendable, Identifiable {
        case wrongRecent = "wrong-recent"
        case frequentMiss = "frequent-miss"
        case stale

        var id: String { rawValue }

        var title: String {
            switch self {
            case .wrongRecent: "最近の間違い"
            case .frequentMiss: "繰り返し間違える"
            case .stale: "しばらく解いてない"
            }
        }
        var description: String {
            switch self {
            case .wrongRecent: "ここ 14 日以内に間違えた問題"
            case .frequentMiss: "通算で 2 回以上間違えた問題"
            case .stale: "7 日以上触れていない問題"
            }
        }
        var icon: String {
            switch self {
            case .wrongRecent: "exclamationmark.triangle.fill"
            case .frequentMiss: "arrow.counterclockwise"
            case .stale: "clock.badge.exclamationmark"
            }
        }
    }

    static let dayMs: TimeInterval = 86_400

    static func candidates(
        rows: [Stats.AttemptRow],
        strategy: Strategy,
        now: Date = .now,
    ) -> [String] {
        var byQ: [String: [Stats.AttemptRow]] = [:]
        for r in rows { byQ[r.questionId, default: []].append(r) }

        var ids: [String] = []
        for (qid, attempts) in byQ {
            guard let latest = attempts.last else { continue }
            let elapsed = now.timeIntervalSince(latest.attemptedAt)

            switch strategy {
            case .wrongRecent:
                if !latest.correct, elapsed <= 14 * dayMs { ids.append(qid) }
            case .frequentMiss:
                let misses = attempts.lazy.filter { !$0.correct }.count
                if misses >= 2 { ids.append(qid) }
            case .stale:
                if elapsed > 7 * dayMs { ids.append(qid) }
            }
        }
        return ids
    }

    static func counts(rows: [Stats.AttemptRow], now: Date = .now)
        -> [Strategy: Int] {
        var out: [Strategy: Int] = [:]
        for s in Strategy.allCases {
            out[s] = candidates(rows: rows, strategy: s, now: now).count
        }
        return out
    }
}
