import SwiftUI

struct OnboardingView: View {
    let onFinish: () -> Void
    @State private var page = 0

    private let pages: [Page] = [
        .init(
            icon: "books.vertical.fill",
            title: "全 2,800 問の過去問",
            body: "公式 IPA 過去問を分野別・年度別にすべて収録。オフラインでも練習できます。",
        ),
        .init(
            icon: "sparkles",
            title: "AI 解説",
            body: "間違えた問題を AI が即座に解説。Pro なら多言語対応の本格解析、無料でも端末上の AI が要点を教えてくれます。",
        ),
        .init(
            icon: "icloud.and.arrow.up",
            title: "Web と双方向同期",
            body: "通勤中はアプリで、家ではブラウザで。サインインすれば進捗が両方に反映されます。",
        ),
    ]

    var body: some View {
        VStack(spacing: 0) {
            TabView(selection: $page) {
                ForEach(Array(pages.enumerated()), id: \.offset) { i, p in
                    pageView(p).tag(i)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .always))

            bottomBar
                .padding(.horizontal, 24)
                .padding(.bottom, 24)
        }
    }

    private func pageView(_ p: Page) -> some View {
        VStack(spacing: 24) {
            Spacer()
            Image(systemName: p.icon)
                .font(.system(size: 96))
                .foregroundStyle(Color.accentColor)
            Text(p.title)
                .font(.title.weight(.bold))
                .multilineTextAlignment(.center)
            Text(p.body)
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .frame(maxWidth: 320)
            Spacer()
        }
        .padding(.horizontal, 32)
    }

    private var bottomBar: some View {
        HStack {
            Button("スキップ") { onFinish() }
                .foregroundStyle(.secondary)
            Spacer()
            Button {
                if page < pages.count - 1 {
                    withAnimation { page += 1 }
                } else {
                    onFinish()
                }
            } label: {
                Text(page == pages.count - 1 ? "始める" : "次へ")
                    .frame(width: 100)
                    .padding(.vertical, 6)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
        }
    }

    private struct Page {
        let icon: String
        let title: String
        let body: String
    }
}
