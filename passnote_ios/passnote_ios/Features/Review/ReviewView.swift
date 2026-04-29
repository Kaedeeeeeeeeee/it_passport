import SwiftUI
import SwiftData

struct ReviewView: View {
    @Environment(QuestionBank.self) private var bank
    @Environment(EntitlementStore.self) private var entitlement
    @Environment(\.modelContext) private var ctx
    @Query(sort: \Attempt.attemptedAt) private var localAttempts: [Attempt]

    @State private var showPaywall = false
    @State private var startingStrategy: Review.Strategy?

    var body: some View {
        Group {
            if entitlement.isPro {
                proContent
            } else {
                ProUpsell(
                    icon: "arrow.uturn.backward",
                    title: "復習モード",
                    message: "Pro で間違えた問題を集中復習",
                    action: { showPaywall = true },
                )
            }
        }
        .navigationTitle("Review")
        .sheet(isPresented: $showPaywall) {
            PricingSheet()
        }
        .navigationDestination(item: $startingStrategy) { strategy in
            startReview(strategy)
        }
    }

    private var attemptRows: [Stats.AttemptRow] {
        localAttempts.map {
            .init(questionId: $0.questionId,
                  correct: $0.correct,
                  attemptedAt: $0.attemptedAt)
        }
    }

    private var counts: [Review.Strategy: Int] {
        Review.counts(rows: attemptRows)
    }

    private var proContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("過去の解答ログから、復習が効きそうな問題を選び出します。")
                    .font(.bodyText)
                    .foregroundStyle(Theme.C.ink2)
                    .lineSpacing(3)
                    .padding(.horizontal, 4)

                VStack(alignment: .leading, spacing: 12) {
                    MarkerTitle(text: "復習方針", size: 22)
                        .padding(.leading, 4)

                    VStack(spacing: 0) {
                        ForEach(Array(Review.Strategy.allCases.enumerated()), id: \.offset) { idx, s in
                            let n = counts[s] ?? 0
                            Button {
                                guard n > 0 else { return }
                                startingStrategy = s
                            } label: {
                                StrategyRow(strategy: s, count: n)
                            }
                            .buttonStyle(.plain)
                            .disabled(n == 0)

                            if idx != Review.Strategy.allCases.count - 1 {
                                Rectangle()
                                    .fill(Theme.C.line)
                                    .frame(height: 1)
                                    .padding(.leading, 56)
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
            .padding(.horizontal, 20)
            .padding(.vertical, 24)
        }
        .paperBackground()
    }

    @ViewBuilder
    private func startReview(_ strategy: Review.Strategy) -> some View {
        let ids = Review.candidates(rows: attemptRows, strategy: strategy)
        let pool = ids.compactMap { bank.byId[$0] }
        if pool.isEmpty {
            ContentUnavailableView(
                "対象問題がありません", systemImage: "checkmark.seal",
            )
        } else {
            // Cap at 30 to keep review sessions snappy
            let n = min(30, pool.count)
            // Map back to a faux source kind = category of the first
            let firstCategory = pool.first?.category
            let source: PracticeSource = firstCategory.map { .category($0) }
                ?? .random
            PracticeView(vm: PracticeViewModel(
                questions: pool.sampled(n),
                source: source,
            ))
        }
    }
}

private struct StrategyRow: View {
    let strategy: Review.Strategy
    let count: Int

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: strategy.icon)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(Theme.C.accentInk)
                .frame(width: 32, height: 32)
                .background(Theme.C.accentSoft, in: RoundedRectangle(cornerRadius: Theme.R.small))

            VStack(alignment: .leading, spacing: 2) {
                Text(strategy.title)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(Theme.C.ink)
                Text(strategy.description)
                    .font(.system(size: 11))
                    .foregroundStyle(Theme.C.ink3)
            }

            Spacer(minLength: 8)

            Text("\(count)")
                .font(.monoCount)
                .foregroundStyle(count > 0 ? Theme.C.ink : Theme.C.ink3)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(.rect)
        .opacity(count > 0 ? 1.0 : 0.55)
    }
}
