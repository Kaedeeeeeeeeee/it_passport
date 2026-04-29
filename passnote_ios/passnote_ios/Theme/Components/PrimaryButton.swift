import SwiftUI

/// Forest-green primary button — mirrors web `.btn-primary`.
/// Use as `Button("…") { … }.buttonStyle(.primary)`.
struct PrimaryButtonStyle: ButtonStyle {
    var fillWidth: Bool = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .medium))
            .foregroundStyle(.white)
            .padding(.horizontal, 18)
            .padding(.vertical, 12)
            .frame(maxWidth: fillWidth ? .infinity : nil)
            .background(
                configuration.isPressed ? Theme.C.accentInk : Theme.C.accent,
                in: RoundedRectangle(cornerRadius: Theme.R.button)
            )
            .opacity(configuration.isPressed ? 0.95 : 1.0)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}

extension ButtonStyle where Self == PrimaryButtonStyle {
    static var primary: PrimaryButtonStyle { PrimaryButtonStyle() }
    static func primary(fillWidth: Bool) -> PrimaryButtonStyle {
        PrimaryButtonStyle(fillWidth: fillWidth)
    }
}
