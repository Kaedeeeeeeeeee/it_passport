import SwiftUI

struct LibraryView: View {
    @Environment(QuestionBank.self) private var bank

    var body: some View {
        List {
            Section("分野") {
                ForEach(QuestionCategory.allCases, id: \.self) { cat in
                    NavigationLink {
                        practiceForCategory(cat)
                    } label: {
                        HStack {
                            Text(label(for: cat))
                            Spacer()
                            Text("\(bank.byCategory[cat]?.count ?? 0)")
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            Section("過去問") {
                ForEach(bank.examCodesSorted, id: \.self) { code in
                    NavigationLink {
                        practiceForExam(code)
                    } label: {
                        HStack {
                            Text(code)
                            Spacer()
                            Text("\(bank.byExam[code]?.count ?? 0)")
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .navigationTitle("Library")
    }

    @ViewBuilder
    private func practiceForCategory(_ cat: QuestionCategory) -> some View {
        let pool = bank.byCategory[cat] ?? []
        let n = min(20, pool.count)
        if pool.isEmpty {
            ContentUnavailableView("問題がありません", systemImage: "tray")
        } else {
            PracticeView(vm: PracticeViewModel(
                questions: pool.sampled(n),
                source: .category(cat),
            ))
        }
    }

    @ViewBuilder
    private func practiceForExam(_ code: String) -> some View {
        let pool = bank.byExam[code] ?? []
        if pool.isEmpty {
            ContentUnavailableView("問題がありません", systemImage: "tray")
        } else {
            // For an exam pick, present in the printed order — same as the
            // web exam mode does. Don't shuffle.
            let ordered = pool.sorted { $0.number < $1.number }
            PracticeView(vm: PracticeViewModel(
                questions: ordered,
                source: .exam(code),
            ))
        }
    }

    private func label(for c: QuestionCategory) -> String {
        switch c {
        case .strategy: "ストラテジ系"
        case .management: "マネジメント系"
        case .technology: "テクノロジ系"
        case .integrated: "総合"
        }
    }
}
