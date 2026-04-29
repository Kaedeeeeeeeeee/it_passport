import SwiftUI

/// Pill-shaped chip — mirrors web `.chip` and `.chip-accent`.
struct ThemedChip: View {
    enum Style {
        case neutral   // surface2 bg, line border, ink2 text
        case accent    // accentSoft bg, no border, accentInk text
        case muted     // transparent bg, line border, ink3 text
    }

    let text: String
    var style: Style = .neutral

    var body: some View {
        Text(text)
            .font(.system(size: 12, weight: .medium))
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .foregroundStyle(fg)
            .background(bg, in: Capsule())
            .overlay(
                Capsule()
                    .stroke(border, lineWidth: 1)
            )
    }

    private var bg: Color {
        switch style {
        case .neutral: Theme.C.surface2
        case .accent:  Theme.C.accentSoft
        case .muted:   .clear
        }
    }
    private var border: Color {
        switch style {
        case .neutral, .muted: Theme.C.line
        case .accent: .clear
        }
    }
    private var fg: Color {
        switch style {
        case .neutral: Theme.C.ink2
        case .accent:  Theme.C.accentInk
        case .muted:   Theme.C.ink3
        }
    }
}
