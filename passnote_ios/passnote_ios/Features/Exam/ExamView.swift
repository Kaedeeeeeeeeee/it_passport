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
                lockedView
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
        List {
            Section("過去問模試") {
                ForEach(bank.examCodesSorted, id: \.self) { code in
                    Button {
                        startCode = code
                    } label: {
                        HStack {
                            VStack(alignment: .leading) {
                                Text(code).font(.body)
                                Text("100 問・100 分・60% 合格")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundStyle(.tertiary)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var lockedView: some View {
        VStack(spacing: 20) {
            Image(systemName: "doc.text.magnifyingglass")
                .font(.system(size: 60))
                .foregroundStyle(.secondary)
            Text("模擬試験")
                .font(.title2.bold())
            Text("Pro で 100 問・100 分の本番形式が解放")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
            Button {
                showPaywall = true
            } label: {
                Text("Pro にアップグレード")
                    .frame(maxWidth: 260)
                    .padding(.vertical, 8)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
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
