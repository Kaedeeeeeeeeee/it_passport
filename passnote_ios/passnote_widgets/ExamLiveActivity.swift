import ActivityKit
import SwiftUI
import WidgetKit

struct ExamLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: ExamActivityAttributes.self) { context in
            // Lock-screen / banner UI
            LockScreenView(context: context)
                .activityBackgroundTint(Color.accentColor.opacity(0.18))
                .activitySystemActionForegroundColor(Color.primary)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label {
                        Text("\(context.state.currentQuestion)/\(context.state.totalQuestions)")
                            .font(.caption.monospacedDigit().weight(.semibold))
                    } icon: {
                        Image(systemName: "doc.text.magnifyingglass")
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(timeLabel(context.state.remainingSeconds))
                        .font(.headline.monospacedDigit())
                        .foregroundStyle(context.state.remainingSeconds < 300 ? .red : .primary)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(context.attributes.examCode)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    ProgressView(
                        value: Double(context.state.currentQuestion),
                        total: Double(context.state.totalQuestions),
                    )
                    .tint(Color.accentColor)
                }
            } compactLeading: {
                Image(systemName: "doc.text.magnifyingglass")
                    .foregroundStyle(Color.accentColor)
            } compactTrailing: {
                Text(timeLabel(context.state.remainingSeconds))
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(context.state.remainingSeconds < 300 ? .red : .primary)
            } minimal: {
                Image(systemName: "timer")
                    .foregroundStyle(Color.accentColor)
            }
        }
    }
}

private struct LockScreenView: View {
    let context: ActivityViewContext<ExamActivityAttributes>

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Label("模擬試験", systemImage: "doc.text.magnifyingglass")
                    .font(.subheadline.weight(.semibold))
                Spacer()
                Text(context.attributes.examCode)
                    .font(.caption.monospacedDigit())
                    .foregroundStyle(.secondary)
            }
            HStack(alignment: .firstTextBaseline) {
                Text("問 \(context.state.currentQuestion) / \(context.state.totalQuestions)")
                    .font(.title3.weight(.semibold).monospacedDigit())
                Spacer()
                Text(timeLabel(context.state.remainingSeconds))
                    .font(.title3.monospacedDigit().weight(.semibold))
                    .foregroundStyle(context.state.remainingSeconds < 300 ? .red : .primary)
            }
            ProgressView(
                value: Double(context.state.currentQuestion),
                total: Double(context.state.totalQuestions),
            )
            .tint(Color.accentColor)
        }
        .padding(14)
    }
}

private func timeLabel(_ seconds: Int) -> String {
    let m = max(seconds, 0) / 60
    let s = max(seconds, 0) % 60
    return String(format: "%02d:%02d", m, s)
}
