import WidgetKit
import SwiftUI

struct TodayQuestionWidget: Widget {
    let kind: String = "TodayQuestionWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TodayQuestionProvider()) { entry in
            TodayQuestionEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("今日の 1 問")
        .description("毎日 1 問のおすすめ過去問")
        .supportedFamilies([.systemMedium])
    }
}

struct TodayQuestionEntry: TimelineEntry {
    let date: Date
    let preview: String
    let examCode: String
}

struct TodayQuestionProvider: TimelineProvider {
    func placeholder(in context: Context) -> TodayQuestionEntry {
        .init(
            date: .now,
            preview: "デファクトスタンダードの意味として，最も適切なものはどれか。",
            examCode: "2009h21a",
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (TodayQuestionEntry) -> Void) {
        completion(currentEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<TodayQuestionEntry>) -> Void) {
        let entry = currentEntry()
        let cal = Calendar.current
        let nextMidnight = cal.nextDate(
            after: .now, matching: DateComponents(hour: 0), matchingPolicy: .nextTime,
        ) ?? Date().addingTimeInterval(86400)
        completion(.init(entries: [entry], policy: .after(nextMidnight)))
    }

    private func currentEntry() -> TodayQuestionEntry {
        let defaults = UserDefaults(suiteName: "group.com.shera.passnote")
        let preview = defaults?.string(forKey: "today.preview")
            ?? "アプリで練習を開始しましょう。"
        let exam = defaults?.string(forKey: "today.examCode") ?? ""
        return .init(date: .now, preview: preview, examCode: exam)
    }
}

struct TodayQuestionEntryView: View {
    let entry: TodayQuestionEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 4) {
                Image(systemName: "lightbulb.fill")
                    .foregroundStyle(.yellow)
                Text("今日の 1 問")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)
                Spacer()
                if !entry.examCode.isEmpty {
                    Text(entry.examCode)
                        .font(.caption2.monospacedDigit())
                        .foregroundStyle(.tertiary)
                }
            }
            Text(entry.preview)
                .font(.callout)
                .lineLimit(4)
            Spacer(minLength: 0)
        }
    }
}
