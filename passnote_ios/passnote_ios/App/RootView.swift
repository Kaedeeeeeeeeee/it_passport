import SwiftUI

struct RootView: View {
    @Environment(QuestionBank.self) private var bank
    @Environment(EntitlementStore.self) private var entitlement

    var body: some View {
        TabView {
            Tab("Home", systemImage: "house") {
                NavigationStack { HomeView() }
            }
            Tab("Library", systemImage: "books.vertical") {
                NavigationStack { LibraryView() }
            }
            Tab("Exam", systemImage: "doc.text.magnifyingglass") {
                NavigationStack { ExamView() }
            }
            .badge(entitlement.isPro ? nil : Text("Pro"))
            Tab("Review", systemImage: "arrow.uturn.backward") {
                NavigationStack { ReviewView() }
            }
            .badge(entitlement.isPro ? nil : Text("Pro"))
            Tab("Stats", systemImage: "chart.bar.xaxis") {
                NavigationStack { StatsView() }
            }
            .badge(entitlement.isPro ? nil : Text("Pro"))
        }
        .tabBarMinimizeBehavior(.onScrollDown)
        .tint(Theme.C.accent)
        .overlay {
            if !bank.loaded {
                if let err = bank.loadError {
                    ContentUnavailableView(
                        "問題を読み込めません",
                        systemImage: "exclamationmark.triangle",
                        description: Text(err),
                    )
                } else {
                    ProgressView("問題を読み込み中…")
                }
            }
        }
    }
}
