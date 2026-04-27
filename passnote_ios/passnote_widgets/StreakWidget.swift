import WidgetKit
import SwiftUI

struct StreakWidget: Widget {
    let kind: String = "StreakWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StreakProvider()) { entry in
            StreakEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("学習ストリーク")
        .description("連続学習日数を一目で確認")
        .supportedFamilies([.systemSmall])
    }
}

struct StreakEntry: TimelineEntry {
    let date: Date
    let streak: Int
}

struct StreakProvider: TimelineProvider {
    func placeholder(in context: Context) -> StreakEntry {
        .init(date: .now, streak: 12)
    }

    func getSnapshot(in context: Context, completion: @escaping (StreakEntry) -> Void) {
        completion(.init(date: .now, streak: readStreak()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<StreakEntry>) -> Void) {
        let entry = StreakEntry(date: .now, streak: readStreak())
        let cal = Calendar.current
        let nextMidnight = cal.nextDate(
            after: .now, matching: DateComponents(hour: 0), matchingPolicy: .nextTime,
        ) ?? Date().addingTimeInterval(3600)
        completion(.init(entries: [entry], policy: .after(nextMidnight)))
    }

    /// Read from the App Group shared UserDefaults — main app writes the
    /// current streak there after each completed session.
    private func readStreak() -> Int {
        let defaults = UserDefaults(suiteName: "group.com.shera.passnote")
        return defaults?.integer(forKey: "streak.days") ?? 0
    }
}

struct StreakEntryView: View {
    let entry: StreakEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Image(systemName: "flame.fill")
                    .foregroundStyle(.orange)
                Text("ストリーク")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.secondary)
            }
            Text("\(entry.streak)")
                .font(.system(size: 48, weight: .bold, design: .rounded).monospacedDigit())
                .foregroundStyle(Color.accentColor)
            Text("日連続")
                .font(.caption2)
                .foregroundStyle(.secondary)
            Spacer()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
