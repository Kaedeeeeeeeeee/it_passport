import SwiftUI

/// Title with a yellow highlighter stripe across the lower 38% — mirrors
/// the web's `linear-gradient(transparent 62%, #f4e4a8 62%)` treatment.
struct MarkerTitle: View {
    let text: LocalizedStringKey
    var size: CGFloat = 26

    var body: some View {
        Text(text)
            .font(.serif(size))
            .foregroundStyle(Theme.C.ink)
            .background(alignment: .bottom) {
                Theme.C.markerYellow
                    .frame(height: size * 0.38)
                    .padding(.horizontal, -2)
                    .offset(y: 1)
            }
            .fixedSize(horizontal: false, vertical: true)
    }
}
