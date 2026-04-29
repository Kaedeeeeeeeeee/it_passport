import SwiftUI

struct ExamView: View {
    @Environment(QuestionBank.self) private var bank
    @Environment(EntitlementStore.self) private var entitlement
    @State private var showPaywall = false
    @State private var startCode: String?

    var body: some View {
        Group {
            if entitlement.isPro {
                proContent
            } else {
                ProUpsell(
                    icon: "doc.text.magnifyingglass",
                    title: "模擬試験",
                    message: "Pro で 100 問・100 分の本番形式が解放",
                    action: { showPaywall = true },
                )
            }
        }
        .navigationTitle("Exam")
        .sheet(isPresented: $showPaywall) {
            PricingSheet()
        }
        .navigationDestination(item: $startCode) { code in
            startExam(code)
        }
    }

    private var proContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                MarkerTitle(text: "過去問模試", size: 22)
                    .padding(.leading, 4)

                VStack(spacing: 0) {
                    ForEach(Array(bank.examCodesSorted.enumerated()), id: \.offset) { idx, code in
                        Button {
                            startCode = code
                        } label: {
                            ExamRow(code: code)
                        }
                        .buttonStyle(.plain)

                        if idx != bank.examCodesSorted.count - 1 {
                            Rectangle()
                                .fill(Theme.C.line)
                                .frame(height: 1)
                                .padding(.leading, 16)
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
            .padding(.horizontal, 20)
            .padding(.vertical, 24)
        }
        .paperBackground()
    }

    @ViewBuilder
    private func startExam(_ code: String) -> some View {
        let pool = bank.byExam[code] ?? []
        if pool.isEmpty {
            ContentUnavailableView("問題がありません", systemImage: "tray")
        } else {
            let ordered = pool.sorted { $0.number < $1.number }
            ExamModeView(vm: ExamModeViewModel(
                questions: ordered,
                examCode: code,
            ))
        }
    }
}

private struct ExamRow: View {
    let code: String

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(code)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(Theme.C.ink)
                Text("100 問・100 分・60% 合格")
                    .font(.system(size: 11))
                    .foregroundStyle(Theme.C.ink3)
            }
            Spacer(minLength: 8)
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Theme.C.ink3)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(.rect)
    }
}
