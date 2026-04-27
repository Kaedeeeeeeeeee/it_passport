import SwiftUI

struct HomeView: View {
    @Environment(QuestionBank.self) private var bank
    @State private var quickStart = false
    @State private var showAccount = false
    @State private var showSettings = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                heroCard
                Text("収録: \(bank.allQuestions.count) 問 · \(bank.byExam.count) 回")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            .padding(20)
        }
        .navigationTitle("Home")
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    showSettings = true
                } label: {
                    Image(systemName: "gearshape")
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showAccount = true
                } label: {
                    Image(systemName: "person.crop.circle")
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
        VStack(alignment: .leading, spacing: 12) {
            Text("クイックスタート")
                .font(.headline)
            Text("ランダムに 20 問・分野ミックス")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            Button {
                quickStart = true
            } label: {
                Label("はじめる", systemImage: "play.fill")
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(bank.allQuestions.isEmpty)
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial, in: .rect(cornerRadius: 20))
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
