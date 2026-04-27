import SwiftUI
import SwiftData

struct PracticeView: View {
    @State var vm: PracticeViewModel
    @Environment(\.modelContext) private var ctx
    @Environment(\.dismiss) private var dismiss

    @State private var sessionClientId = UUID().uuidString
    @State private var didStartSession = false
    @State private var showResult = false

    var body: some View {
        VStack(spacing: 0) {
            Topbar(
                idx: vm.index,
                total: vm.questions.count,
                progress: vm.progress,
                label: vm.source.label,
                onEnd: { dismiss() },
            )

            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    QuestionMetadataView(question: vm.current)
                    if let context = vm.current.integratedContext, !context.isEmpty {
                        IntegratedContextView(
                            groupId: vm.current.integratedGroupId,
                            context: context,
                            figures: vm.current.figures,
                        )
                    }
                    QuestionBodyView(question: vm.current)
                    ChoicesView(
                        question: vm.current,
                        answered: vm.currentAnswer,
                        correctLetters: vm.correctLetters,
                        onPick: handlePick,
                    )
                    if vm.currentAnswer != nil {
                        AnswerReveal(
                            correctLetters: vm.correctLetters,
                            picked: vm.currentAnswer!,
                        )
                        AiExplanationView(
                            question: vm.current,
                            userAnswer: vm.currentAnswer?.letter,
                            language: .ja,
                        )
                    }
                }
                .padding(20)
            }
            .id(vm.index)  // reset scroll on question change

            FooterBar(
                canPrev: vm.canGoPrev,
                answered: vm.currentAnswer != nil,
                isLast: vm.isLast,
                onPrev: { vm.goPrev() },
                onNext: { vm.goNext() },
                onFinish: finish,
            )
        }
        .navigationBarBackButtonHidden(true)
        .navigationDestination(isPresented: $showResult) {
            ResultView(vm: vm)
        }
    }

    private func handlePick(_ letter: String) {
        guard vm.pick(letter) else { return }

        if !didStartSession {
            let session = StudySession(
                kind: .practice,
                source: vm.source,
                questionCount: vm.questions.count,
                startedAt: vm.startedAt,
            )
            session.clientId = sessionClientId
            ctx.insert(session)
            didStartSession = true
        }

        let q = vm.current
        let a = Attempt(
            questionId: q.id,
            answer: letter,
            correct: vm.correctLetters.contains(letter),
            sessionClientId: sessionClientId,
        )
        ctx.insert(a)

        let container = ctx.container
        Task { await SyncEngine.shared.kick(modelContainer: container) }
    }

    private func finish() {
        let target = sessionClientId
        let descriptor = FetchDescriptor<StudySession>(
            predicate: #Predicate { $0.clientId == target },
        )
        if let s = try? ctx.fetch(descriptor).first {
            s.completedAt = .now
            s.correctCount = vm.correctCount
        }
        showResult = true

        let container = ctx.container
        Task { await SyncEngine.shared.flushNow(modelContainer: container) }
    }
}

// MARK: - Topbar

private struct Topbar: View {
    let idx: Int
    let total: Int
    let progress: Int
    let label: String
    let onEnd: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Button("やめる", action: onEnd)
                .buttonStyle(.plain)
                .font(.caption)
                .foregroundStyle(.secondary)

            Text("\(String(format: "%02d", idx + 1)) / \(total)")
                .font(.caption.monospacedDigit())
                .foregroundStyle(.secondary)

            ProgressView(value: Double(progress), total: Double(total))
                .progressViewStyle(.linear)
                .tint(.accentColor)

            Text(label)
                .font(.caption2)
                .foregroundStyle(.tertiary)
                .lineLimit(1)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(.bar)
        .overlay(alignment: .bottom) {
            Divider()
        }
    }
}

// MARK: - Footer

private struct FooterBar: View {
    let canPrev: Bool
    let answered: Bool
    let isLast: Bool
    let onPrev: () -> Void
    let onNext: () -> Void
    let onFinish: () -> Void

    var body: some View {
        HStack {
            Button("前へ", action: onPrev)
                .disabled(!canPrev)

            Spacer()

            if answered {
                if isLast {
                    Button("結果を見る", action: onFinish)
                        .buttonStyle(.borderedProminent)
                } else {
                    Button("次へ", action: onNext)
                        .buttonStyle(.borderedProminent)
                }
            } else {
                Text("選択肢を選んでください")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(.bar)
        .overlay(alignment: .top) {
            Divider()
        }
    }
}

// MARK: - Answer reveal

private struct AnswerReveal: View {
    let correctLetters: Set<String>
    let picked: PracticeAnswer

    var body: some View {
        let letters = correctLetters.sorted().joined(separator: "・")
        HStack(spacing: 8) {
            Image(systemName: picked.correct ? "checkmark.circle.fill" : "xmark.circle.fill")
                .foregroundStyle(picked.correct ? .green : .red)
            Text(picked.correct ? "正解" : "不正解 — 正答は \(letters)")
                .font(.subheadline.weight(.medium))
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background((picked.correct ? Color.green : Color.red).opacity(0.10),
                    in: .rect(cornerRadius: 10))
    }
}
