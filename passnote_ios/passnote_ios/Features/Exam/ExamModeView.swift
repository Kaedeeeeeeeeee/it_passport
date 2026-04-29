import SwiftUI
import SwiftData

struct ExamModeView: View {
    @State var vm: ExamModeViewModel
    @Environment(\.modelContext) private var ctx
    @Environment(\.dismiss) private var dismiss

    @State private var sessionClientId = UUID().uuidString
    @State private var didStartSession = false
    @State private var showSubmitConfirm = false
    @State private var navToResult = false

    @State private var ticker: Timer?

    var body: some View {
        VStack(spacing: 0) {
            topBar
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
                        // In exam mode we do NOT reveal correctness mid-exam:
                        // pass nil so the user can keep changing.
                        answered: nil,
                        correctLetters: [],
                        onPick: handlePick,
                    )
                    if let pick = vm.currentAnswer {
                        Text("選択: \(pick.letter)")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(Theme.C.ink3)
                            .padding(.top, 4)
                    }
                }
                .padding(20)
            }
            .id(vm.index)
            .paperBackground()
            footerBar
        }
        .navigationBarBackButtonHidden(true)
        .navigationDestination(isPresented: $navToResult) {
            ExamResultView(vm: vm, examCode: vm.examCode)
        }
        .alert("提出しますか？", isPresented: $showSubmitConfirm) {
            Button("キャンセル", role: .cancel) {}
            Button("提出", role: .destructive) { commitSubmit() }
        } message: {
            let unanswered = vm.questions.count - vm.progress
            Text(unanswered > 0
                 ? "未回答が \(unanswered) 問あります。"
                 : "全問回答しました。")
        }
        .onAppear { startTicker() }
        .onDisappear { ticker?.invalidate() }
        .onChange(of: vm.isFinished) { _, finished in
            if finished, !navToResult { commitSubmit() }
        }
    }

    private var topBar: some View {
        HStack(spacing: 12) {
            Button("中断") { ticker?.invalidate(); dismiss() }
                .buttonStyle(.plain)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Theme.C.ink3)
            Text("\(vm.index + 1) / \(vm.questions.count)")
                .font(.monoCount)
                .foregroundStyle(Theme.C.ink2)
            ProgressView(
                value: Double(vm.progress), total: Double(vm.questions.count),
            )
            .tint(Theme.C.accent)
            Spacer()
            Label(vm.timeLabel, systemImage: "timer")
                .font(.system(size: 13, weight: .semibold).monospacedDigit())
                .foregroundStyle(vm.remainingSeconds < 300 ? Theme.C.wrong : Theme.C.ink)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Theme.C.surface)
        .overlay(alignment: .bottom) {
            Rectangle().fill(Theme.C.line).frame(height: 1)
        }
    }

    private var footerBar: some View {
        HStack {
            Button("前へ") { vm.goPrev() }
                .buttonStyle(.ghost)
                .disabled(vm.index == 0)
                .opacity(vm.index == 0 ? 0.4 : 1.0)
            Spacer()
            if vm.index == vm.questions.count - 1 {
                Button("提出") { showSubmitConfirm = true }
                    .buttonStyle(.primary)
            } else {
                Button("次へ") { vm.goNext() }
                    .buttonStyle(.primary)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Theme.C.surface)
        .overlay(alignment: .top) {
            Rectangle().fill(Theme.C.line).frame(height: 1)
        }
    }

    // MARK: -

    private func startTicker() {
        ticker?.invalidate()
        ticker = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            Task { @MainActor in vm.tick() }
        }
    }

    private func handlePick(_ letter: String) {
        if !didStartSession {
            let s = StudySession(
                kind: .exam,
                source: .exam(vm.examCode),
                questionCount: vm.questions.count,
                startedAt: vm.startedAt,
            )
            s.clientId = sessionClientId
            ctx.insert(s)
            didStartSession = true
        }
        vm.pick(letter)
    }

    private func commitSubmit() {
        ticker?.invalidate()
        // Persist all answers as Attempts (idempotent server-side via dedup).
        for (i, a) in vm.answers.enumerated() {
            guard let a else { continue }
            let q = vm.questions[i]
            let row = Attempt(
                questionId: q.id, answer: a.letter, correct: a.correct,
                sessionClientId: sessionClientId,
            )
            ctx.insert(row)
        }
        // Finalise the session row.
        let target = sessionClientId
        let descriptor = FetchDescriptor<StudySession>(
            predicate: #Predicate { $0.clientId == target },
        )
        if let s = try? ctx.fetch(descriptor).first {
            s.completedAt = .now
            s.correctCount = vm.correctCount
        }
        let container = ctx.container
        Task { await SyncEngine.shared.flushNow(modelContainer: container) }
        navToResult = true
    }
}

// MARK: - Result

struct ExamResultView: View {
    let vm: ExamModeViewModel
    let examCode: String
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(spacing: 12) {
                    Image(systemName: vm.passed ? "checkmark.seal.fill" : "xmark.seal")
                        .font(.system(size: 56, weight: .light))
                        .foregroundStyle(.white)
                        .frame(width: 96, height: 96)
                        .background(
                            vm.passed ? Theme.C.correct : Theme.C.wrong,
                            in: Circle()
                        )
                        .padding(.top, 24)
                    Text(vm.passed ? "合格" : "不合格")
                        .font(.serif(34))
                        .foregroundStyle(Theme.C.ink)
                    Text("\(vm.correctCount) / \(vm.questions.count) 正解")
                        .font(.system(size: 18, weight: .semibold).monospacedDigit())
                        .foregroundStyle(Theme.C.ink2)
                    Text("基準点 \(vm.passingThreshold) 問（60%）")
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.C.ink3)
                }
                .frame(maxWidth: .infinity)

                VStack(alignment: .leading, spacing: 12) {
                    MarkerTitle(text: "結果一覧", size: 22)
                        .padding(.leading, 4)

                    LazyVStack(spacing: 0) {
                        ForEach(Array(vm.questions.enumerated()), id: \.element.id) { i, q in
                            ExamResultRow(
                                index: i + 1,
                                question: q,
                                answer: vm.answers[i],
                            )
                            if i != vm.questions.count - 1 {
                                Rectangle()
                                    .fill(Theme.C.line)
                                    .frame(height: 1)
                                    .padding(.leading, 50)
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
        .navigationTitle(examCode)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("閉じる") { dismiss() }
                    .foregroundStyle(Theme.C.ink2)
            }
        }
    }
}

private struct ExamResultRow: View {
    let index: Int
    let question: Question
    let answer: PracticeAnswer?

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text("\(index)")
                .font(.monoCount)
                .foregroundStyle(Theme.C.ink3)
                .frame(width: 30, alignment: .trailing)
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
