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
                lockedView
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
    }

    // MARK: Overview

    private func overviewCard(_ o: Stats.Overview) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("概要").font(.headline)
            HStack(spacing: 16) {
                statBlock("正答率", value: percent(o.accuracy), tint: .accentColor)
                statBlock("解答数", value: "\(o.total)", tint: .blue)
                statBlock("習得", value: "\(o.mastered)", tint: .green)
                statBlock("連続日数", value: "\(o.streak)", tint: .orange)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial, in: .rect(cornerRadius: 16))
    }

    private func statBlock(_ label: String, value: String, tint: Color) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title2.weight(.bold).monospacedDigit())
                .foregroundStyle(tint)
            Text(label).font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: Daily trend

    private func dailyTrendCard(_ days: [Stats.DailyBucket]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("直近 30 日").font(.headline)
            Chart {
                ForEach(days) { d in
                    BarMark(
                        x: .value("Date", d.date, unit: .day),
                        y: .value("Total", d.total),
                    )
                    .foregroundStyle(.secondary.opacity(0.4))
                    BarMark(
                        x: .value("Date", d.date, unit: .day),
                        y: .value("Correct", d.correct),
                    )
                    .foregroundStyle(Color.accentColor)
                }
            }
            .chartYAxis {
                AxisMarks(position: .leading)
            }
            .frame(height: 160)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial, in: .rect(cornerRadius: 16))
    }

    // MARK: Category breakdown

    private func categoryBreakdownCard(_ cats: [Stats.CategoryStat]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("分野別").font(.headline)
            ForEach(cats) { c in
                HStack {
                    Text(label(for: c.category))
                        .frame(width: 120, alignment: .leading)
                    ProgressView(value: c.accuracy)
                        .tint(tint(for: c.accuracy))
                    Text(percent(c.accuracy))
                        .font(.caption.monospacedDigit())
                        .foregroundStyle(.secondary)
                        .frame(width: 48, alignment: .trailing)
                }
                Text("\(c.correct) / \(c.total)")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial, in: .rect(cornerRadius: 16))
    }

    // MARK: Exam matrix

    private func examMatrixCard(_ exams: [Stats.ExamStat]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("過去問別").font(.headline)
            VStack(alignment: .leading, spacing: 8) {
                ForEach(exams) { e in
                    HStack {
                        Text(e.examCode).font(.callout)
                        Spacer()
                        Text("\(e.correct) / \(e.total)")
                            .font(.caption.monospacedDigit())
                            .foregroundStyle(.secondary)
                        Text(percent(e.accuracy))
                            .font(.caption.monospacedDigit())
                            .foregroundStyle(tint(for: e.accuracy))
                            .frame(width: 56, alignment: .trailing)
                    }
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial, in: .rect(cornerRadius: 16))
    }

    // MARK: Helpers

    private func percent(_ d: Double) -> String {
        "\(Int(round(d * 100)))%"
    }

    private func tint(for accuracy: Double) -> Color {
        switch accuracy {
        case 0.8...: .green
        case 0.6..<0.8: .accentColor
        case 0.4..<0.6: .orange
        default: .red
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

    // MARK: Locked

    private var lockedView: some View {
        VStack(spacing: 20) {
            Image(systemName: "chart.bar.xaxis")
                .font(.system(size: 60))
                .foregroundStyle(.secondary)
            Text("学習統計").font(.title2.bold())
            Text("Pro で進捗グラフと弱点分析が解放")
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
}
