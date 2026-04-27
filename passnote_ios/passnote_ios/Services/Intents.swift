import AppIntents
import Foundation

// MARK: - Quick-start practice ("Hey Siri, ITパス練習")

struct StartPracticeIntent: AppIntent {
    static let title: LocalizedStringResource = "練習を始める"
    static let description = IntentDescription(
        "ランダムに 20 問の練習を始めます。",
    )
    static let openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        // Deep link the app into the quick-start flow. The app reads this
        // pasteboard-like NSUserActivity on launch and opens the practice
        // view directly. For now we just open the app — the launch screen
        // already exposes a "クイックスタート" button.
        .result()
    }
}

// MARK: - Show stats

struct ShowStatsIntent: AppIntent {
    static let title: LocalizedStringResource = "学習統計を見る"
    static let description = IntentDescription(
        "学習の進捗ダッシュボードを開きます。",
    )
    static let openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        .result()
    }
}

// MARK: - Today's question (returns a snippet)

struct TodayQuestionIntent: AppIntent {
    static let title: LocalizedStringResource = "今日の 1 問"
    static let description = IntentDescription(
        "今日のおすすめ 1 問を表示します。",
    )

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog {
        let bank = QuestionBank()
        await bank.load()
        guard let question = bank.allQuestions.randomElement() else {
            return .result(dialog: "問題を読み込めませんでした。")
        }
        let dialog = """
        \(question.examCode) 問\(question.number):
        \(question.question)

        正解: \(question.answer)
        """
        return .result(dialog: IntentDialog(stringLiteral: dialog))
    }
}

// MARK: - App Shortcuts (surfaces in Spotlight + Siri suggestions)

struct PassnoteShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: StartPracticeIntent(),
            phrases: [
                "\(.applicationName) を始める",
                "\(.applicationName) で練習",
            ],
            shortTitle: "練習を始める",
            systemImageName: "play.fill",
        )
        AppShortcut(
            intent: ShowStatsIntent(),
            phrases: ["\(.applicationName) の統計"],
            shortTitle: "学習統計",
            systemImageName: "chart.bar.xaxis",
        )
        AppShortcut(
            intent: TodayQuestionIntent(),
            phrases: ["\(.applicationName) の今日の問題"],
            shortTitle: "今日の 1 問",
            systemImageName: "lightbulb",
        )
    }
}
