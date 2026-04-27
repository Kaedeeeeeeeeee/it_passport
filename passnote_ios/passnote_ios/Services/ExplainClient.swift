import Foundation
import Observation

#if canImport(FoundationModels)
import FoundationModels
#endif

/// Routing for AI explanations:
///   1. POST `/api/explain` — hits the server-side `ai_explanations` cache.
///      A cache hit returns the full Gemini-quality explanation regardless
///      of subscription status (so any user can ride a previously-cached row).
///   2. Cache miss + Pro user → server still calls Gemini live and returns it.
///   3. Cache miss + Free user → server returns 402; we fall back to the
///      on-device `SystemLanguageModel` (iOS 26+) and clearly label the
///      output as "簡易版", with a Pro upgrade CTA.
enum ExplainSource: Sendable, Equatable {
    case cloudCached
    case cloudFresh
    case onDevice
    case error(String)
}

struct ExplainResult: Sendable, Equatable {
    let text: String
    let source: ExplainSource
}

@MainActor
@Observable
final class ExplainClient {
    private(set) var inFlightForQuestion: String?
    private(set) var results: [String: ExplainResult] = [:]

    func explanation(for question: Question, userAnswer: String?, language: ExplainLanguage) async {
        guard inFlightForQuestion != question.id else { return }
        inFlightForQuestion = question.id
        defer { inFlightForQuestion = nil }

        // 1) Try cloud (cache or Gemini, depending on user)
        if let cloudResult = await fetchCloudExplanation(
            questionId: question.id, userAnswer: userAnswer, language: language,
        ) {
            results[question.id] = cloudResult
            return
        }

        // 2) On-device fallback for free users
        let onDevice = await onDeviceExplanation(
            question: question, userAnswer: userAnswer, language: language,
        )
        results[question.id] = onDevice
    }

    func clear(for questionId: String) {
        results[questionId] = nil
    }

    // MARK: - Cloud

    private struct ExplainBody: Encodable, Sendable {
        let questionId: String
        let userAnswer: String?
        let language: String
    }

    private struct ExplainResponse: Decodable, Sendable {
        let explanation: String
        let cached: Bool?
    }

    private func fetchCloudExplanation(
        questionId: String, userAnswer: String?, language: ExplainLanguage,
    ) async -> ExplainResult? {
        let body = ExplainBody(
            questionId: questionId,
            userAnswer: userAnswer,
            language: language.rawValue,
        )
        do {
            let resp: ExplainResponse = try await APIClient.shared.post(
                "/api/explain", body: body, as: ExplainResponse.self,
            )
            return ExplainResult(
                text: resp.explanation,
                source: resp.cached == true ? .cloudCached : .cloudFresh,
            )
        } catch {
            return nil
        }
    }

    // MARK: - On-device (Foundation Models)

    private func onDeviceExplanation(
        question: Question, userAnswer: String?, language: ExplainLanguage,
    ) async -> ExplainResult {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            do {
                let session = LanguageModelSession(
                    instructions: ExplainPrompt.systemPrompt(language),
                )
                let prompt = ExplainPrompt.userPrompt(
                    question: question, userAnswer: userAnswer,
                )
                let response = try await session.respond(to: prompt)
                return ExplainResult(text: response.content, source: .onDevice)
            } catch {
                return ExplainResult(
                    text: "解説を生成できませんでした。\(error.localizedDescription)",
                    source: .error(error.localizedDescription),
                )
            }
        }
        #endif
        return ExplainResult(
            text: "解説はオンライン専用です。インターネットに接続してください。",
            source: .error("foundation-models-unavailable"),
        )
    }
}
