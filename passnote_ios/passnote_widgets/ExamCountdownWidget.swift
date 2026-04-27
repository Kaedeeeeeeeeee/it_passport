import WidgetKit
import SwiftUI

struct ExamCountdownWidget: Widget {
    let kind: String = "ExamCountdownWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ExamCountdownProvider()) { entry in
            ExamCountdownEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("試験までの日数")
        .description("試験本番までのカウントダウン")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct ExamCountdownEntry: TimelineEntry {
    let date: Date
    let examDate: Date?
    let daysLeft: Int?
}

struct ExamCountdownProvider: TimelineProvider {
    func placeholder(in context: Context) -> ExamCountdownEntry {
        let target = Calendar.current.date(byAdding: .day, value: 30, to: .now)
        return .init(date: .now, examDate: target, daysLeft: 30)
    }

    func getSnapshot(in context: Context, completion: @escaping (ExamCountdownEntry) -> Void) {
        completion(currentEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ExamCountdownEntry>) -> Void) {
        let entry = currentEntry()
        let cal = Calendar.current
        let nextMidnight = cal.nextDate(
            after: .now, matching: DateComponents(hour: 0), matchingPolicy: .nextTime,
        ) ?? Date().addingTimeInterval(86400)
        completion(.init(entries: [entry], policy: .after(nextMidnight)))
    }

    private func currentEntry() -> ExamCountdownEntry {
        let defaults = UserDefaults(suiteName: "group.com.shera.passnote")
        guard let interval = defaults?.double(forKey: "exam.targetDate"),
              interval > 0 else {
            return .init(date: .now, examDate: nil, daysLeft: nil)
        }
        let target = Date(timeIntervalSince1970: interval)
        let cal = Calendar.current
        let days = cal.dateComponents(
            [.day], from: cal.startOfDay(for: .now), to: cal.startOfDay(for: target),
        ).day
        return .init(date: .now, examDate: target, daysLeft: days)
    }
}

struct ExamCountdownEntryView: View {
    let entry: ExamCountdownEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Image(systemName: "calendar.badge.clock")
                    .foregroundStyle(.red)
                Text("試験まで")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)
            }

            if let days = entry.daysLeft {
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text("\(days)")
                        .font(.system(size: 56, weight: .bold, design: .rounded).monospacedDigit())
                        .foregroundStyle(days <= 7 ? .red : Color.accentColor)
                    Text("日")
                        .font(.title3.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
                if let target = entry.examDate {
                    Text(target, style: .date)
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            } else {
                Text("試験日を設定")
                    .font(.callout)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
