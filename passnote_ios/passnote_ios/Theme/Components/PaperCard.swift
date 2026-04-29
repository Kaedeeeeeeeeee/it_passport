import SwiftUI

/// White surface, 1pt warm-tan border, no shadow. Mirrors web `.card`.
struct PaperCard<Content: View>: View {
    var padding: CGFloat = Theme.S.cardPad
    @ViewBuilder var content: Content

    var body: some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.C.surface)
            .overlay(
                RoundedRectangle(cornerRadius: Theme.R.card)
                    .stroke(Theme.C.line, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: Theme.R.card))
    }
}
