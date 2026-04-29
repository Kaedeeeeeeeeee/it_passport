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
            VStack(alignment: .leading, spacing: 24) {
                VStack(spacing: 16) {
                    ScoreCircle(percent: percent)
                        .padding(.top, 16)

                    VStack(spacing: 4) {
                        Text("\(vm.correctCount) / \(vm.questions.count) 正解")
                            .font(.serif(20))
                            .foregroundStyle(Theme.C.ink)
                        Text(vm.source.label)
                            .font(.system(size: 13))
                            .foregroundStyle(Theme.C.ink3)
                    }
                }
                .frame(maxWidth: .infinity)

                VStack(alignment: .leading, spacing: 12) {
                    MarkerTitle(text: "結果一覧", size: 22)
                        .padding(.leading, 4)

                    LazyVStack(spacing: 0) {
                        ForEach(Array(vm.questions.enumerated()), id: \.element.id) { idx, q in
                            ResultRow(index: idx + 1,
                                      question: q,
                                      answer: vm.answers[idx])
                            if idx != vm.questions.count - 1 {
                                Rectangle()
                                    .fill(Theme.C.line)
                                    .frame(height: 1)
                                    .padding(.leading, 44)
                            }
                        }
                    }
                    .background(Theme.C.surface)
                    .overlay(
                        RoundedRectangle(cornerRadius: Theme.R.card)
                            .stroke(Theme.C.line, lineWidth: 1)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: Theme.R.card))
                }
            }
            .padding(20)
            .padding(.bottom, 16)
        }
        .paperBackground()
        .navigationTitle("結果")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("閉じる") { dismiss() }
                    .foregroundStyle(Theme.C.ink2)
            }
        }
    }
}

private struct ScoreCircle: View {
    let percent: Int

    var body: some View {
        ZStack {
            Circle()
                .stroke(Theme.C.line, lineWidth: 14)
            Circle()
                .trim(from: 0, to: CGFloat(percent) / 100)
                .stroke(tintColor, style: StrokeStyle(lineWidth: 14, lineCap: .round))
                .rotationEffect(.degrees(-90))
                .animation(.easeOut(duration: 0.6), value: percent)
            VStack(spacing: 0) {
                Text("\(percent)")
                    .font(.system(size: 56, weight: .bold, design: .rounded))
                    .foregroundStyle(Theme.C.ink)
                Text("%")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(Theme.C.ink3)
            }
        }
        .frame(width: 180, height: 180)
    }

    private var tintColor: Color {
        switch percent {
        case 80...:    Theme.C.accent
        case 60..<80:  Theme.C.accentMuted
        case 40..<60:  Theme.C.flag
        default:       Theme.C.wrong
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
                .font(.monoCount)
                .foregroundStyle(Theme.C.ink3)
                .frame(width: 24, alignment: .trailing)
            VStack(alignment: .leading, spacing: 4) {
                Text(question.question)
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.C.ink)
                    .lineLimit(2)
                HStack(spacing: 6) {
                    Image(systemName: icon)
                        .foregroundStyle(iconColor)
                        .font(.system(size: 11))
                    Text(meta)
                        .font(.system(size: 11))
                        .foregroundStyle(Theme.C.ink3)
                }
            }
        }
        .padding(.vertical, 12)
        .padding(.horizontal, 14)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var icon: String {
        guard let a = answer else { return "minus.circle" }
        return a.correct ? "checkmark.circle.fill" : "xmark.circle.fill"
    }

    private var iconColor: Color {
        guard let a = answer else { return Theme.C.ink3 }
        return a.correct ? Theme.C.correct : Theme.C.wrong
    }

    private var meta: String {
        guard let a = answer else { return "未回答 — 正答 \(question.answer)" }
        if a.correct { return "回答 \(a.letter)" }
        return "回答 \(a.letter) — 正答 \(question.answer)"
    }
}
