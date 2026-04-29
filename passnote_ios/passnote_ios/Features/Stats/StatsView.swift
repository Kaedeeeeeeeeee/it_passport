import SwiftUI
import SwiftData
import Charts

struct StatsView: View {
    @Environment(QuestionBank.self) private var bank
    @Environment(EntitlementStore.self) private var entitlement
    @Query(sort: \Attempt.attemptedAt) private var localAttempts: [Attempt]

    @State private var showPaywall = false

    var body: some View {
        Group {
            if entitlement.isPro {
                proContent
            } else {
                ProUpsell(
                    icon: "chart.bar.xaxis",
                    title: "学習統計",
                    message: "Pro で進捗グラフと弱点分析が解放",
                    action: { showPaywall = true },
                )
            }
        }
        .navigationTitle("Stats")
        .sheet(isPresented: $showPaywall) {
            PricingSheet()
        }
    }

    private var attemptRows: [Stats.AttemptRow] {
        localAttempts.map {
            .init(questionId: $0.questionId,
                  correct: $0.correct,
                  attemptedAt: $0.attemptedAt)
        }
    }

    @ViewBuilder
    private var proContent: some View {
        let rows = attemptRows
        let overview = Stats.overview(rows: rows)
        let daily = Stats.recentDaily(rows: rows, days: 30)
        let categories = Stats.byCategory(rows: rows, questions: bank.byId)
        let exams = Stats.byExam(rows: rows, questions: bank.byId)

        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                if rows.isEmpty {
                    ContentUnavailableView(
                        "まだデータがありません",
                        systemImage: "chart.bar.xaxis",
                        description: Text("練習や模試を始めると統計が表示されます。"),
                    )
                    .frame(maxWidth: .infinity)
                    .padding(.top, 40)
                } else {
                    overviewCard(overview)
                    dailyTrendCard(daily)
                    categoryBreakdownCard(categories)
                    examMatrixCard(exams)
                }
            }
            .padding(20)
        }
        .paperBackground()
    }

    // MARK: Overview

    private func overviewCard(_ o: Stats.Overview) -> some View {
        cardSection(title: "概要") {
            HStack(spacing: 12) {
                statBlock("正答率", value: percent(o.accuracy), tint: Theme.C.accent)
                statBlock("解答数", value: "\(o.total)", tint: Theme.C.ink)
                statBlock("習得", value: "\(o.mastered)", tint: Theme.C.correct)
                statBlock("連続日数", value: "\(o.streak)", tint: Theme.C.flag)
            }
        }
    }

    private func statBlock(_ label: String, value: String, tint: Color) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.system(size: 22, weight: .semibold).monospacedDigit())
                .foregroundStyle(tint)
            Text(label)
                .font(.tLabel)
                .foregroundStyle(Theme.C.ink3)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: Daily trend

    private func dailyTrendCard(_ days: [Stats.DailyBucket]) -> some View {
        cardSection(title: "直近 30 日") {
            Chart {
                ForEach(days) { d in
                    BarMark(
                        x: .value("Date", d.date, unit: .day),
                        y: .value("Total", d.total),
                    )
                    .foregroundStyle(Theme.C.line)
                    BarMark(
                        x: .value("Date", d.date, unit: .day),
                        y: .value("Correct", d.correct),
                    )
                    .foregroundStyle(Theme.C.accent)
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading)
            }
            .frame(height: 160)
        }
    }

    // MARK: Category breakdown

    private func categoryBreakdownCard(_ cats: [Stats.CategoryStat]) -> some View {
        cardSection(title: "分野別") {
            VStack(alignment: .leading, spacing: 14) {
                ForEach(cats) { c in
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(label(for: c.category))
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(Theme.C.ink)
                                .frame(width: 120, alignment: .leading)
                            ProgressView(value: c.accuracy)
                                .tint(tint(for: c.accuracy))
                            Text(percent(c.accuracy))
                                .font(.monoCount)
                                .foregroundStyle(Theme.C.ink2)
                                .frame(width: 44, alignment: .trailing)
                        }
                        Text("\(c.correct) / \(c.total)")
                            .font(.system(size: 11))
                            .foregroundStyle(Theme.C.ink3)
                            .padding(.leading, 120)
                    }
                }
            }
        }
    }

    // MARK: Exam matrix

    private func examMatrixCard(_ exams: [Stats.ExamStat]) -> some View {
        cardSection(title: "過去問別") {
            VStack(alignment: .leading, spacing: 0) {
                ForEach(Array(exams.enumerated()), id: \.element.id) { idx, e in
                    HStack {
                        Text(e.examCode)
                            .font(.system(size: 14))
                            .foregroundStyle(Theme.C.ink)
                        Spacer()
                        Text("\(e.correct) / \(e.total)")
                            .font(.monoCount)
                            .foregroundStyle(Theme.C.ink3)
                        Text(percent(e.accuracy))
                            .font(.system(size: 12, weight: .semibold).monospacedDigit())
                            .foregroundStyle(tint(for: e.accuracy))
                            .frame(width: 52, alignment: .trailing)
                    }
                    .padding(.vertical, 10)
                    if idx != exams.count - 1 {
                        Rectangle()
                            .fill(Theme.C.line)
                            .frame(height: 1)
                    }
                }
            }
        }
    }

    // MARK: Helpers

    @ViewBuilder
    private func cardSection<Content: View>(
        title: LocalizedStringKey,
        @ViewBuilder _ content: () -> Content,
    ) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            MarkerTitle(text: title, size: 20)
                .padding(.leading, 4)
            PaperCard {
                content()
            }
        }
    }

    private func percent(_ d: Double) -> String {
        "\(Int(round(d * 100)))%"
    }

    private func tint(for accuracy: Double) -> Color {
        switch accuracy {
        case 0.8...:    Theme.C.accent
        case 0.6..<0.8: Theme.C.accentMuted
        case 0.4..<0.6: Theme.C.flag
        default:        Theme.C.wrong
        }
    }

    private func label(for c: QuestionCategory?) -> String {
        switch c {
        case .strategy: "ストラテジ"
        case .management: "マネジメント"
        case .technology: "テクノロジ"
        case .integrated: "総合"
        case nil: "その他"
        }
    }
}
