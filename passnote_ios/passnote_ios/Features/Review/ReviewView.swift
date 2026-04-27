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
                lockedView
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
        List {
            Section {
                Text("過去の解答ログから、復習が効きそうな問題を選び出します。")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            Section("復習方針") {
                ForEach(Review.Strategy.allCases) { s in
                    let n = counts[s] ?? 0
                    Button {
                        guard n > 0 else { return }
                        startingStrategy = s
                    } label: {
                        HStack(spacing: 14) {
                            Image(systemName: s.icon)
                                .frame(width: 28)
                                .foregroundStyle(Color.accentColor)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(s.title).font(.body)
                                Text(s.description)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Text("\(n)")
                                .font(.subheadline.monospacedDigit())
                                .foregroundStyle(n > 0 ? .primary : .tertiary)
                        }
                        .contentShape(.rect)
                    }
                    .buttonStyle(.plain)
                    .disabled(n == 0)
                }
            }
        }
    }

    private var lockedView: some View {
        VStack(spacing: 20) {
            Image(systemName: "arrow.uturn.backward.circle.fill")
                .font(.system(size: 60))
                .foregroundStyle(.secondary)
            Text("復習モード")
                .font(.title2.bold())
            Text("Pro で間違えた問題を集中復習")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
            Button { showPaywall = true } label: {
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
