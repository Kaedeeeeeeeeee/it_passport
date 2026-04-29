import SwiftUI

struct HomeView: View {
    @Environment(QuestionBank.self) private var bank
    @State private var quickStart = false
    @State private var showAccount = false
    @State private var showSettings = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                MarkerTitle(text: "クイックスタート", size: 26)
                    .padding(.top, 4)

                heroCard

                Text("収録: \(bank.allQuestions.count) 問 · \(bank.byExam.count) 回")
                    .font(.tLabel)
                    .foregroundStyle(Theme.C.ink3)
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 24)
        }
        .paperBackground()
        .navigationTitle("Home")
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    showSettings = true
                } label: {
                    Image(systemName: "gearshape")
                        .foregroundStyle(Theme.C.ink2)
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showAccount = true
                } label: {
                    Image(systemName: "person.crop.circle")
                        .foregroundStyle(Theme.C.ink2)
                }
            }
        }
        .navigationDestination(isPresented: $quickStart) {
            quickPractice()
        }
        .navigationDestination(isPresented: $showAccount) {
            AccountView()
        }
        .navigationDestination(isPresented: $showSettings) {
            SettingsView()
        }
    }

    private var heroCard: some View {
        PaperCard {
            VStack(alignment: .leading, spacing: 14) {
                Text("ランダムに 20 問・分野ミックス")
                    .font(.bodyText)
                    .foregroundStyle(Theme.C.ink2)
                    .lineSpacing(3)

                Button {
                    quickStart = true
                } label: {
                    Label("はじめる", systemImage: "play.fill")
                }
                .buttonStyle(.primary(fillWidth: true))
                .disabled(bank.allQuestions.isEmpty)
            }
        }
    }

    @ViewBuilder
    private func quickPractice() -> some View {
        let n = min(20, bank.allQuestions.count)
        if bank.allQuestions.isEmpty {
            ContentUnavailableView("問題がありません", systemImage: "tray")
        } else {
            PracticeView(vm: PracticeViewModel(
                questions: bank.allQuestions.sampled(n),
                source: .random,
            ))
        }
    }
}
