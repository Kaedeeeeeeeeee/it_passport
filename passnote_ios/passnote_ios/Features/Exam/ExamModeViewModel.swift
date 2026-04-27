import Foundation
import Observation

@MainActor
@Observable
final class ExamModeViewModel {
    let questions: [Question]
    let examCode: String
    let totalSeconds: Int
    let startedAt: Date

    var index: Int = 0
    var answers: [PracticeAnswer?]
    var remainingSeconds: Int
    var isFinished = false

    init(questions: [Question], examCode: String, totalSeconds: Int = 100 * 60) {
        self.questions = questions
        self.examCode = examCode
        self.totalSeconds = totalSeconds
        self.remainingSeconds = totalSeconds
        self.startedAt = .now
        self.answers = Array(repeating: nil, count: questions.count)
    }

    var current: Question { questions[index] }
    var currentAnswer: PracticeAnswer? { answers[index] }
    var progress: Int { answers.lazy.filter { $0 != nil }.count }
    var correctCount: Int { answers.lazy.filter { $0?.correct == true }.count }
    var passingThreshold: Int { Int(ceil(Double(questions.count) * 0.6)) }
    var passed: Bool { correctCount >= passingThreshold }

    var correctLetters: Set<String> {
        Set(current.answer.split(separator: "/").map(String.init))
    }

    var timeLabel: String {
        let m = remainingSeconds / 60
        let s = remainingSeconds % 60
        return String(format: "%02d:%02d", m, s)
    }

    func tick() {
        guard !isFinished, remainingSeconds > 0 else { return }
        remainingSeconds -= 1
        if remainingSeconds == 0 { isFinished = true }
    }

    /// Exam mode allows changing answers up until submit; pick is idempotent
    /// (overwrites the previous answer for this question).
    func pick(_ letter: String) {
        let correct = correctLetters.contains(letter)
        answers[index] = PracticeAnswer(letter: letter, correct: correct)
    }

    func goNext() { if index + 1 < questions.count { index += 1 } }
    func goPrev() { if index > 0 { index -= 1 } }
    func goTo(_ i: Int) { if (0..<questions.count).contains(i) { index = i } }
    func submit() { isFinished = true }
}
