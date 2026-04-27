import SwiftUI

private let allLetters = ["ア", "イ", "ウ", "エ"]

// MARK: - Metadata chips

struct QuestionMetadataView: View {
    let question: Question

    var body: some View {
        HStack(spacing: 8) {
            if let cat = question.category {
                Chip(text: categoryLabel(cat), tint: .accentColor)
            }
            Chip(text: "\(question.examCode) · 問\(question.number)", tint: .secondary)
            if let groupId = question.integratedGroupId {
                let letter = groupId.split(separator: "-").last.map(String.init) ?? ""
                Chip(text: "大問 \(letter)", tint: .secondary)
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

private struct Chip: View {
    let text: String
    let tint: Color

    var body: some View {
        Text(text)
            .font(.caption2)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .foregroundStyle(tint)
            .background(tint.opacity(0.12), in: .capsule)
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
                    .font(.callout)
                    .foregroundStyle(.secondary)
                ForEach(figures, id: \.path) { fig in
                    FigureView(figure: fig)
                }
            }
            .padding(.top, 8)
        } label: {
            Text("大問 \(letter) の問題文")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.secondary)
        }
        .padding(12)
        .background(.regularMaterial, in: .rect(cornerRadius: 12))
    }
}

// MARK: - Question body

struct QuestionBodyView: View {
    let question: Question

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(stripImageMarkdown(question.question))
                .font(.body)
                .lineSpacing(4)
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
                    .font(.subheadline.weight(.semibold))
                    .frame(width: 28, height: 28)
                    .foregroundStyle(state.letterFg)
                    .background(state.letterBg, in: .rect(cornerRadius: 6))
                if isFigRef || isFigureChoice {
                    FigureView(
                        figure: Figure(path: figurePath, type: nil, description: nil),
                        maxWidth: 280,
                    )
                    Spacer(minLength: 0)
                } else {
                    Text(stripImageMarkdown(raw))
                        .font(.callout)
                        .foregroundStyle(.primary)
                        .multilineTextAlignment(.leading)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding(14)
            .background(bg, in: .rect(cornerRadius: 12))
            .overlay {
                RoundedRectangle(cornerRadius: 12)
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
                .font(.title2.weight(.semibold))
                .frame(maxWidth: .infinity, minHeight: 64)
                .foregroundStyle(state.letterFg)
                .background(state.background, in: .rect(cornerRadius: 12))
                .overlay {
                    RoundedRectangle(cornerRadius: 12)
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
        case .idle: Color(.secondarySystemBackground)
        case .correct: Color.green.opacity(0.18)
        case .wrongPick: Color.red.opacity(0.18)
        case .otherWrong: Color(.secondarySystemBackground)
        }
    }
    var border: Color {
        switch self {
        case .idle: Color(.separator)
        case .correct: Color.green
        case .wrongPick: Color.red
        case .otherWrong: Color(.separator)
        }
    }
    var letterBg: Color {
        switch self {
        case .idle: Color(.tertiarySystemBackground)
        case .correct: Color.green
        case .wrongPick: Color.red
        case .otherWrong: Color(.tertiarySystemBackground)
        }
    }
    var letterFg: Color {
        switch self {
        case .idle, .otherWrong: .primary
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
                .background(.white, in: .rect(cornerRadius: 8))
                .accessibilityLabel(figure.description ?? "figure")
        } else {
            Text("⚠︎ figure missing: \(figure.path)")
                .font(.caption)
                .foregroundStyle(.tertiary)
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
