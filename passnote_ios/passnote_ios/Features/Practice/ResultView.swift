import SwiftUI

struct ResultView: View {
    let vm: PracticeViewModel
    @Environment(\.dismiss) private var dismiss

    private var percent: Int {
        guard vm.questions.count > 0 else { return 0 }
        return Int(round(Double(vm.correctCount) / Double(vm.questions.count) * 100))
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                ScoreCircle(percent: percent)
                    .padding(.top, 32)

                VStack(spacing: 4) {
                    Text("\(vm.correctCount) / \(vm.questions.count) 正解")
                        .font(.title3.weight(.semibold))
                    Text(vm.source.label)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                List {
                    Section("結果一覧") {
                        ForEach(Array(vm.questions.enumerated()), id: \.element.id) { idx, q in
                            ResultRow(index: idx + 1,
                                      question: q,
                                      answer: vm.answers[idx])
                        }
                    }
                }
                .listStyle(.insetGrouped)
                .frame(minHeight: 320)
                .scrollDisabled(true)
            }
            .padding(.bottom, 32)
        }
        .navigationTitle("結果")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("閉じる") { dismiss() }
            }
        }
    }
}

private struct ScoreCircle: View {
    let percent: Int

    var body: some View {
        ZStack {
            Circle()
                .stroke(Color(.systemGray5), lineWidth: 14)
            Circle()
                .trim(from: 0, to: CGFloat(percent) / 100)
                .stroke(tintColor, style: StrokeStyle(lineWidth: 14, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.easeOut(duration: 0.6), value: percent)
            VStack(spacing: 0) {
                Text("\(percent)")
                    .font(.system(size: 56, weight: .bold, design: .rounded))
                Text("%")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(width: 180, height: 180)
    }

    private var tintColor: Color {
        switch percent {
        case 80...: .green
        case 60..<80: .accentColor
        case 40..<60: .orange
        default: .red
        }
    }
}

private struct ResultRow: View {
    let index: Int
    let question: Question
    let answer: PracticeAnswer?

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(index)")
                .font(.caption.monospacedDigit())
                .foregroundStyle(.tertiary)
                .frame(width: 24, alignment: .trailing)
            VStack(alignment: .leading, spacing: 2) {
                Text(question.question)
                    .font(.subheadline)
                    .lineLimit(2)
                HStack(spacing: 6) {
                    Image(systemName: icon)
                        .foregroundStyle(iconColor)
                    Text(meta)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(.vertical, 2)
    }

    private var icon: String {
        guard let a = answer else { return "minus.circle" }
        return a.correct ? "checkmark.circle.fill" : "xmark.circle.fill"
    }

    private var iconColor: Color {
        guard let a = answer else { return .secondary }
        return a.correct ? .green : .red
    }

    private var meta: String {
        guard let a = answer else { return "未回答 — 正答 \(question.answer)" }
        if a.correct { return "回答 \(a.letter)" }
        return "回答 \(a.letter) — 正答 \(question.answer)"
    }
}
