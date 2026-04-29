import SwiftUI

/// Shared "Pro is required" empty state — used by Exam/Review/Stats locked
/// views. SF Symbol icon sits inside an accent-soft circle, then a serif
/// title + body, then a primary upgrade button.
struct ProUpsell: View {
    let icon: String
    let title: LocalizedStringKey
    let message: LocalizedStringKey
    let action: () -> Void

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: icon)
                .font(.system(size: 32, weight: .light))
                .foregroundStyle(Theme.C.accent)
                .frame(width: 88, height: 88)
                .background(Theme.C.accentSoft, in: Circle())

            VStack(spacing: 8) {
                Text(title)
                    .font(.serif(22))
                    .foregroundStyle(Theme.C.ink)
                Text(message)
                    .font(.bodyText)
                    .foregroundStyle(Theme.C.ink2)
                    .multilineTextAlignment(.center)
                    .lineSpacing(3)
            }
            .frame(maxWidth: 320)

            Button(action: action) {
                Label("Pro にアップグレード", systemImage: "sparkles")
            }
            .buttonStyle(.primary)
            .padding(.top, 4)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .paperBackground()
    }
}
