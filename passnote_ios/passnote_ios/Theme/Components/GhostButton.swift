import SwiftUI

/// Transparent button with hover/press tint — mirrors web `.btn-ghost`.
/// Use as `Button("…") { … }.buttonStyle(.ghost)`.
struct GhostButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .medium))
            .foregroundStyle(Theme.C.ink2)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(
                configuration.isPressed ? Theme.C.surface2 : .clear,
                in: RoundedRectangle(cornerRadius: Theme.R.button)
            )
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

/// Bordered (secondary) button — like `.btn` without `.btn-primary`.
struct BorderedButtonStyle2: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .medium))
            .foregroundStyle(Theme.C.ink)
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(
                configuration.isPressed ? Theme.C.surface2 : Theme.C.surface,
                in: RoundedRectangle(cornerRadius: Theme.R.button)
            )
            .overlay(
                RoundedRectangle(cornerRadius: Theme.R.button)
                    .stroke(Theme.C.lineStrong, lineWidth: 1)
            )
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

extension ButtonStyle where Self == GhostButtonStyle {
    static var ghost: GhostButtonStyle { GhostButtonStyle() }
}

extension ButtonStyle where Self == BorderedButtonStyle2 {
    static var paperBordered: BorderedButtonStyle2 { BorderedButtonStyle2() }
}
