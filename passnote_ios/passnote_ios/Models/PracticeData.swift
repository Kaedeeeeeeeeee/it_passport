import Foundation
import SwiftData

enum SessionKind: String, Codable, Sendable {
    case practice
    case exam
    case review
}

/// What seeded a practice session. Mirrors the `source` payload that
/// `/api/sync-progress` accepts on the web side.
enum PracticeSource: Hashable, Sendable {
    case random
    case exam(String)            // exam_code, e.g. "2009h21a"
    case category(QuestionCategory)

    var sourceKind: String {
        switch self {
        case .random: "random"
        case .exam: "exam"
        case .category: "category"
        }
    }

    var examCode: String? {
        if case .exam(let code) = self { return code }
        return nil
    }

    var categoryRaw: String? {
        if case .category(let c) = self { return c.rawValue }
        return nil
    }

    var label: String {
        switch self {
        case .random:
            return "ランダム"
        case .exam(let code):
            return code
        case .category(let c):
            switch c {
            case .strategy: return "ストラテジ系"
            case .management: return "マネジメント系"
            case .technology: return "テクノロジ系"
            case .integrated: return "総合"
            }
        }
    }
}

/// Append-only record of a single answered question. `clientId` is a stable
/// local UUID string used for idempotency: the planned W3 sync engine will
/// replay unsent rows and the server's `(user_id, question_id, attempted_at)`
/// unique constraint silently dedupes any duplicates that still slip through.
@Model
final class Attempt {
    @Attribute(.unique) var clientId: String
    var questionId: String
    var answer: String
    var correct: Bool
    var attemptedAt: Date
    var sessionClientId: String?
    var syncedAt: Date?

    init(questionId: String,
         answer: String,
         correct: Bool,
         attemptedAt: Date = .now,
         sessionClientId: String? = nil) {
        self.clientId = UUID().uuidString
        self.questionId = questionId
        self.answer = answer
        self.correct = correct
        self.attemptedAt = attemptedAt
        self.sessionClientId = sessionClientId
    }
}

/// A batch of attempts (practice / exam / review). `clientId` is local; the
/// server-issued UUID lands in `serverId` after first successful sync.
@Model
final class StudySession {
    @Attribute(.unique) var clientId: String
    var kindRaw: String
    var sourceKind: String
    var sourceExamCode: String?
    var sourceCategory: String?
    var startedAt: Date
    var completedAt: Date?
    var questionCount: Int
    var correctCount: Int?
    var serverId: String?

    init(kind: SessionKind,
         source: PracticeSource,
         questionCount: Int,
         startedAt: Date = .now) {
        self.clientId = UUID().uuidString
        self.kindRaw = kind.rawValue
        self.sourceKind = source.sourceKind
        self.sourceExamCode = source.examCode
        self.sourceCategory = source.categoryRaw
        self.startedAt = startedAt
        self.questionCount = questionCount
    }

    var kind: SessionKind { SessionKind(rawValue: kindRaw) ?? .practice }
}
