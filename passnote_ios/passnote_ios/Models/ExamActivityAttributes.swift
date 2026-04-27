import ActivityKit
import Foundation

/// Mirror of `passnote_widgets/ExamActivityAttributes.swift`. Same struct
/// declared in both targets so each compile unit has a local definition
/// without a shared module — `Filesystem Synchronized Groups` in Xcode 16
/// are per-target so we duplicate this small declaration. Keep both files
/// byte-identical when editing.
public struct ExamActivityAttributes: ActivityAttributes {
    public typealias ContentState = State

    public struct State: Codable, Hashable, Sendable {
        public var currentQuestion: Int
        public var totalQuestions: Int
        public var remainingSeconds: Int
        public var correctSoFar: Int

        public init(
            currentQuestion: Int,
            totalQuestions: Int,
            remainingSeconds: Int,
            correctSoFar: Int,
        ) {
            self.currentQuestion = currentQuestion
            self.totalQuestions = totalQuestions
            self.remainingSeconds = remainingSeconds
            self.correctSoFar = correctSoFar
        }
    }

    public let examCode: String
    public let totalQuestions: Int

    public init(examCode: String, totalQuestions: Int) {
        self.examCode = examCode
        self.totalQuestions = totalQuestions
    }
}
