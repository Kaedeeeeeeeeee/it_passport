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
            .paperBackground()

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
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Theme.C.ink3)

            Text("\(String(format: "%02d", idx + 1)) / \(total)")
                .font(.monoCount)
                .foregroundStyle(Theme.C.ink2)

            ProgressView(value: Double(progress), total: Double(total))
                .progressViewStyle(.linear)
                .tint(Theme.C.accent)

            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Theme.C.ink3)
                .lineLimit(1)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Theme.C.surface)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Theme.C.line)
                .frame(height: 1)
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
                .buttonStyle(.ghost)
                .disabled(!canPrev)
                .opacity(canPrev ? 1.0 : 0.4)

            Spacer()

            if answered {
                if isLast {
                    Button("結果を見る", action: onFinish)
                        .buttonStyle(.primary)
                } else {
                    Button("次へ", action: onNext)
                        .buttonStyle(.primary)
                }
            } else {
                Text("選択肢を選んでください")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.C.ink3)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Theme.C.surface)
        .overlay(alignment: .top) {
            Rectangle()
                .fill(Theme.C.line)
                .frame(height: 1)
        }
    }
}

// MARK: - Answer reveal

private struct AnswerReveal: View {
    let correctLetters: Set<String>
    let picked: PracticeAnswer

    var body: some View {
        let letters = correctLetters.sorted().joined(separator: "・")
        let tint = picked.correct ? Theme.C.correct : Theme.C.wrong
        HStack(spacing: 10) {
            Image(systemName: picked.correct ? "checkmark.circle.fill" : "xmark.circle.fill")
                .foregroundStyle(tint)
            Text(picked.correct ? "正解" : "不正解 — 正答は \(letters)")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Theme.C.ink)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(tint.opacity(0.10), in: RoundedRectangle(cornerRadius: Theme.R.card))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.R.card)
                .stroke(tint.opacity(0.35), lineWidth: 1)
        )
    }
}
