import SwiftUI

private let allLetters = ["ア", "イ", "ウ", "エ"]

// MARK: - Metadata chips

struct QuestionMetadataView: View {
    let question: Question

    var body: some View {
        HStack(spacing: 6) {
            if let cat = question.category {
                ThemedChip(text: categoryLabel(cat), style: .accent)
            }
            ThemedChip(text: "\(question.examCode) · 問\(question.number)", style: .neutral)
            if let groupId = question.integratedGroupId {
                let letter = groupId.split(separator: "-").last.map(String.init) ?? ""
                ThemedChip(text: "大問 \(letter)", style: .muted)
            }
            Spacer(minLength: 0)
        }
    }

    private func categoryLabel(_ c: QuestionCategory) -> String {
        switch c {
        case .strategy: "ストラテジ系"
        case .management: "マネジメント系"
        case .technology: "テクノロジ系"
        case .integrated: "総合"
        }
    }
}

// MARK: - Integrated context (collapsible)

struct IntegratedContextView: View {
    let groupId: String?
    let context: String
    let figures: [Figure]
    @State private var expanded = true

    var body: some View {
        let letter = groupId?.split(separator: "-").last.map(String.init) ?? ""
        DisclosureGroup(isExpanded: $expanded) {
            VStack(alignment: .leading, spacing: 12) {
                Text(stripImageMarkdown(context))
                    .font(.bodyText)
                    .foregroundStyle(Theme.C.ink2)
                    .lineSpacing(3)
                ForEach(figures, id: \.path) { fig in
                    FigureView(figure: fig)
                }
            }
            .padding(.top, 8)
        } label: {
            Text("大問 \(letter) の問題文")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Theme.C.ink2)
        }
        .padding(14)
        .background(Theme.C.surface2, in: RoundedRectangle(cornerRadius: Theme.R.card))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.R.card)
                .stroke(Theme.C.line, lineWidth: 1)
        )
    }
}

// MARK: - Question body

struct QuestionBodyView: View {
    let question: Question

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(stripImageMarkdown(question.question))
                .font(.bodyTextLarge)
                .foregroundStyle(Theme.C.ink)
                .lineSpacing(7)
            // Show all figures separately. Inline-image markdown in the
            // question text is uncommon; defer fancy interleaving to later.
            if question.choiceFormat != .figureChoices {
                ForEach(question.figures, id: \.path) { fig in
                    FigureView(figure: fig)
                }
            }
        }
    }
}

// MARK: - Choices

struct ChoicesView: View {
    let question: Question
    let answered: PracticeAnswer?
    let correctLetters: Set<String>
    let onPick: (String) -> Void

    var body: some View {
        switch question.choiceFormat {
        case .seeFigure:
            seeFigureGrid
        default:
            VStack(spacing: 10) {
                ForEach(allLetters, id: \.self) { letter in
                    if let raw = question.choices[letter] {
                        ChoiceRow(
                            letter: letter,
                            raw: raw,
                            isFigureChoice: question.choiceFormat == .figureChoices,
                            answered: answered,
                            correctLetters: correctLetters,
                            onPick: onPick,
                        )
                    }
                }
            }
        }
    }

    private var seeFigureGrid: some View {
        let cols = [GridItem(.flexible()), GridItem(.flexible()),
                    GridItem(.flexible()), GridItem(.flexible())]
        return LazyVGrid(columns: cols, spacing: 10) {
            ForEach(allLetters, id: \.self) { letter in
                LetterButton(
                    letter: letter,
                    state: state(for: letter),
                    onPick: onPick,
                )
            }
        }
    }

    private func state(for letter: String) -> ChoiceState {
        guard let a = answered else { return .idle }
        if correctLetters.contains(letter) { return .correct }
        if a.letter == letter { return .wrongPick }
        return .otherWrong
    }
}

private struct ChoiceRow: View {
    let letter: String
    let raw: String
    let isFigureChoice: Bool
    let answered: PracticeAnswer?
    let correctLetters: Set<String>
    let onPick: (String) -> Void

    var body: some View {
        let isFigRef = raw.hasPrefix("figure:")
        let figurePath = isFigRef ? String(raw.dropFirst(7)) : raw
        let state = computeState()
        let bg = state.background
        let border = state.border

        Button(action: { if answered == nil { onPick(letter) } }) {
            HStack(alignment: .top, spacing: 12) {
                Text(letter)
                    .font(.system(size: 14, weight: .semibold))
                    .frame(width: 28, height: 28)
                    .foregroundStyle(state.letterFg)
                    .background(state.letterBg, in: RoundedRectangle(cornerRadius: Theme.R.small))
                if isFigRef || isFigureChoice {
                    FigureView(
                        figure: Figure(path: figurePath, type: nil, description: nil),
                        maxWidth: 280,
                    )
                    Spacer(minLength: 0)
                } else {
                    Text(stripImageMarkdown(raw))
                        .font(.bodyText)
                        .foregroundStyle(Theme.C.ink)
                        .multilineTextAlignment(.leading)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .lineSpacing(4)
                }
            }
            .padding(14)
            .background(bg, in: RoundedRectangle(cornerRadius: Theme.R.button))
            .overlay {
                RoundedRectangle(cornerRadius: Theme.R.button)
                    .stroke(border, lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
        .disabled(answered != nil)
    }

    private func computeState() -> ChoiceState {
        guard let a = answered else { return .idle }
        if correctLetters.contains(letter) { return .correct }
        if a.letter == letter { return .wrongPick }
        return .otherWrong
    }
}

private struct LetterButton: View {
    let letter: String
    let state: ChoiceState
    let onPick: (String) -> Void

    var body: some View {
        Button(action: { onPick(letter) }) {
            Text(letter)
                .font(.serif(22))
                .frame(maxWidth: .infinity, minHeight: 64)
                .foregroundStyle(state.letterFg)
                .background(state.background, in: RoundedRectangle(cornerRadius: Theme.R.button))
                .overlay {
                    RoundedRectangle(cornerRadius: Theme.R.button)
                        .stroke(state.border, lineWidth: 1)
                }
        }
        .buttonStyle(.plain)
    }
}

private enum ChoiceState {
    case idle, correct, wrongPick, otherWrong

    var background: Color {
        switch self {
        case .idle, .otherWrong: Theme.C.surface
        case .correct:           Theme.C.accentSoft
        case .wrongPick:         Theme.C.wrong.opacity(0.10)
        }
    }
    var border: Color {
        switch self {
        case .idle, .otherWrong: Theme.C.line
        case .correct:           Theme.C.accent
        case .wrongPick:         Theme.C.wrong
        }
    }
    var letterBg: Color {
        switch self {
        case .idle, .otherWrong: Theme.C.surface2
        case .correct:           Theme.C.accent
        case .wrongPick:         Theme.C.wrong
        }
    }
    var letterFg: Color {
        switch self {
        case .idle, .otherWrong: Theme.C.ink2
        case .correct, .wrongPick: .white
        }
    }
}

// MARK: - Figure rendering

struct FigureView: View {
    let figure: Figure
    var maxWidth: CGFloat = .infinity

    var body: some View {
        if let image = loadImage(figure.path) {
            Image(uiImage: image)
                .resizable()
                .scaledToFit()
                .frame(maxWidth: maxWidth)
                .background(Theme.C.surface)
                .clipShape(RoundedRectangle(cornerRadius: Theme.R.small))
                .overlay(
                    RoundedRectangle(cornerRadius: Theme.R.small)
                        .stroke(Theme.C.line, lineWidth: 1)
                )
                .accessibilityLabel(figure.description ?? "figure")
        } else {
            Text("⚠︎ figure missing: \(figure.path)")
                .font(.system(size: 11))
                .foregroundStyle(Theme.C.ink3)
        }
    }

    /// Bundle path: `Resources/<path>`. Resources/ is added as a folder
    /// reference (blue), so the on-disk hierarchy is preserved inside the
    /// app's main bundle. Strip a leading `figures/` if present — paths in
    /// questions.json look like `figures/<exam>/<file>.jpeg`.
    private func loadImage(_ path: String) -> UIImage? {
        let trimmed = path.hasPrefix("figures/") ? String(path.dropFirst(8)) : path
        let url = Bundle.main.bundleURL
            .appendingPathComponent("figures")
            .appendingPathComponent(trimmed)
        if let data = try? Data(contentsOf: url) {
            return UIImage(data: data)
        }
        // Fallback: the resource was added as a group instead of a folder
        // reference — try a flat lookup.
        let name = (trimmed as NSString).lastPathComponent
        if let nsname = name.split(separator: ".").first.map(String.init),
           let url = Bundle.main.url(forResource: nsname, withExtension: "jpeg"),
           let data = try? Data(contentsOf: url) {
            return UIImage(data: data)
        }
        return nil
    }
}

// MARK: - Helpers

/// Drop `![alt](path)` markdown image syntax. Inline interleaving with text
/// is rare in the corpus; we render figures separately below the question
/// body for now and revisit when we add a full Markdown renderer.
private func stripImageMarkdown(_ s: String) -> String {
    var out = s
    while let range = out.range(of: #"!\[[^\]]*\]\([^)]+\)"#, options: .regularExpression) {
        out.removeSubrange(range)
    }
    return out.trimmingCharacters(in: .whitespacesAndNewlines)
}
