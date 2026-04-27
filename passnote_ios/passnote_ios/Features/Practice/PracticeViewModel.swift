import Foundation
import Observation

struct PracticeAnswer: Hashable, Sendable {
    let letter: String
    let correct: Bool
}

@MainActor
@Observable
final class PracticeViewModel {
    let questions: [Question]
    let source: PracticeSource
    let startedAt: Date

    var index: Int = 0
    var answers: [PracticeAnswer?]

    init(questions: [Question], source: PracticeSource) {
        self.questions = questions
        self.source = source
        self.startedAt = .now
        self.answers = Array(repeating: nil, count: questions.count)
    }

    var current: Question { questions[index] }
    var currentAnswer: PracticeAnswer? { answers[index] }
    var progress: Int { answers.lazy.filter { $0 != nil }.count }
    var isLast: Bool { index == questions.count - 1 }
    var canGoPrev: Bool { index > 0 }
    var correctCount: Int { answers.lazy.filter { $0?.correct == true }.count }

    var correctLetters: Set<String> {
        Set(current.answer.split(separator: "/").map(String.init))
    }

    /// Commit an answer for the current question. Returns true if this was a
    /// fresh commit (so the caller knows to record an Attempt row); false if
    /// the question was already answered (idempotent / no double-count).
    func pick(_ letter: String) -> Bool {
        guard answers[index] == nil else { return false }
        let correct = correctLetters.contains(letter)
        answers[index] = PracticeAnswer(letter: letter, correct: correct)
        return true
    }

    func goNext() { if !isLast { index += 1 } }
    func goPrev() { if canGoPrev { index -= 1 } }
}
