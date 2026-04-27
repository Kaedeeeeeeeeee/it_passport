import ActivityKit
import Foundation

/// Shared between main app + widget extension. The same struct is also
/// duplicated in `passnote_ios/Models/ExamActivityAttributes.swift` so the
/// main app can call Activity<ExamActivityAttributes>.request without a
/// cross-target import (Filesystem Synchronized Groups are per-target).
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
