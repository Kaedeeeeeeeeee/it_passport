import SwiftUI

/// Page-level beige background — mirrors web `--bg`.
struct PaperBackground: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(Theme.C.paper.ignoresSafeArea())
    }
}

extension View {
    /// Apply the warm paper background to the page root.
    func paperBackground() -> some View {
        modifier(PaperBackground())
    }
}
