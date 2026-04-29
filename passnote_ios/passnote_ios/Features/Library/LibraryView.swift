import SwiftUI

struct LibraryView: View {
    @Environment(QuestionBank.self) private var bank

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                section(title: "分野") {
                    ForEach(QuestionCategory.allCases, id: \.self) { cat in
                        NavigationLink {
                            practiceForCategory(cat)
                        } label: {
                            LibraryRow(
                                title: label(for: cat),
                                count: bank.byCategory[cat]?.count ?? 0,
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }

                section(title: "過去問") {
                    ForEach(bank.examCodesSorted, id: \.self) { code in
                        NavigationLink {
                            practiceForExam(code)
                        } label: {
                            LibraryRow(
                                title: code,
                                count: bank.byExam[code]?.count ?? 0,
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 24)
        }
        .paperBackground()
        .navigationTitle("Library")
    }

    @ViewBuilder
    private func section<Content: View>(
        title: LocalizedStringKey,
        @ViewBuilder _ content: () -> Content,
    ) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            MarkerTitle(text: title, size: 22)
                .padding(.leading, 4)

            VStack(spacing: 0) {
                content()
            }
            .background(Theme.C.surface)
            .overlay(
                RoundedRectangle(cornerRadius: Theme.R.card)
                    .stroke(Theme.C.line, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: Theme.R.card))
        }
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

private struct LibraryRow: View {
    let title: String
    let count: Int

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                Text(title)
                    .font(.system(size: 15))
                    .foregroundStyle(Theme.C.ink)
                Spacer(minLength: 8)
                Text("\(count)")
                    .font(.monoCount)
                    .foregroundStyle(Theme.C.ink3)
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(Theme.C.ink3)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .contentShape(.rect)
        }
        .overlay(alignment: .bottom) {
            // Inset divider that matches web's row dividers
            Rectangle()
                .fill(Theme.C.line)
                .frame(height: 1)
                .padding(.leading, 16)
        }
    }
}
