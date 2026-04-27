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
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .padding(.top, 4)
                    }
                }
                .padding(20)
            }
            .id(vm.index)
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
                .font(.caption)
                .foregroundStyle(.secondary)
            Text("\(vm.index + 1) / \(vm.questions.count)")
                .font(.caption.monospacedDigit())
                .foregroundStyle(.secondary)
            ProgressView(
                value: Double(vm.progress), total: Double(vm.questions.count),
            )
            .tint(.accentColor)
            Spacer()
            Label(vm.timeLabel, systemImage: "timer")
                .font(.subheadline.monospacedDigit().weight(.semibold))
                .foregroundStyle(vm.remainingSeconds < 300 ? .red : .primary)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(.bar)
        .overlay(alignment: .bottom) { Divider() }
    }

    private var footerBar: some View {
        HStack {
            Button("前へ") { vm.goPrev() }
                .disabled(vm.index == 0)
            Spacer()
            if vm.index == vm.questions.count - 1 {
                Button("提出") { showSubmitConfirm = true }
                    .buttonStyle(.borderedProminent)
            } else {
                Button("次へ") { vm.goNext() }
                    .buttonStyle(.borderedProminent)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(.bar)
        .overlay(alignment: .top) { Divider() }
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
            VStack(spacing: 24) {
                Image(systemName: vm.passed ? "checkmark.seal.fill" : "xmark.seal")
                    .font(.system(size: 72))
                    .foregroundStyle(vm.passed ? .green : .red)
                    .padding(.top, 32)
                Text(vm.passed ? "合格" : "不合格")
                    .font(.largeTitle.weight(.bold))
                Text("\(vm.correctCount) / \(vm.questions.count) 正解")
                    .font(.title2.monospacedDigit())
                    .foregroundStyle(.secondary)
                Text("基準点 \(vm.passingThreshold) 問（60%）")
                    .font(.footnote)
                    .foregroundStyle(.tertiary)

                List {
                    Section("結果一覧") {
                        ForEach(Array(vm.questions.enumerated()), id: \.element.id) { i, q in
                            ExamResultRow(
                                index: i + 1,
                                question: q,
                                answer: vm.answers[i],
                            )
                        }
                    }
                }
                .listStyle(.insetGrouped)
                .frame(minHeight: 320)
                .scrollDisabled(true)
            }
            .padding(.bottom, 32)
        }
        .navigationTitle(examCode)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("閉じる") { dismiss() }
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
                .font(.caption.monospacedDigit())
                .foregroundStyle(.tertiary)
                .frame(width: 30, alignment: .trailing)
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
