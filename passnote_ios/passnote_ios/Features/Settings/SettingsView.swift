import SwiftUI

struct SettingsView: View {
    @Environment(LocalizationStore.self) private var localization
    @Environment(\.openURL) private var openURL

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                languageSection
                legalSection
                appInfoSection
                disclaimer
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 24)
        }
        .paperBackground()
        .navigationTitle("Settings")
    }

    // MARK: Language

    private var languageSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            MarkerTitle(text: "言語", size: 22)
                .padding(.leading, 4)

            PaperCard {
                HStack {
                    Text("表示言語")
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.C.ink3)
                    Spacer()
                    Picker("", selection: Binding(
                        get: { localization.current },
                        set: { newValue in
                            Task { await localization.setLocale(newValue) }
                        },
                    )) {
                        ForEach(AppLocale.allCases) { l in
                            Text(l.displayName).tag(l)
                        }
                    }
                    .pickerStyle(.menu)
                    .tint(Theme.C.ink)
                }
            }
        }
    }

    // MARK: Legal

    private var legalSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            MarkerTitle(text: "法的事項", size: 22)
                .padding(.leading, 4)

            VStack(spacing: 0) {
                linkRow(icon: "hand.raised", title: "プライバシーポリシー") {
                    if let url = URL(string: "https://it-passport-steel.vercel.app/legal/privacy") {
                        openURL(url)
                    }
                }
                Rectangle().fill(Theme.C.line).frame(height: 1).padding(.leading, 50)
                linkRow(icon: "doc.text", title: "利用規約") {
                    if let url = URL(string: "https://it-passport-steel.vercel.app/legal/terms") {
                        openURL(url)
                    }
                }
            }
            .background(Theme.C.surface)
            .overlay(
                RoundedRectangle(cornerRadius: Theme.R.card)
                    .stroke(Theme.C.line, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: Theme.R.card))
        }
    }

    private func linkRow(
        icon: String,
        title: LocalizedStringKey,
        action: @escaping () -> Void,
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 13))
                    .foregroundStyle(Theme.C.accentInk)
                    .frame(width: 28, height: 28)
                    .background(Theme.C.accentSoft, in: RoundedRectangle(cornerRadius: Theme.R.small))
                Text(title)
                    .font(.system(size: 14))
                    .foregroundStyle(Theme.C.ink)
                Spacer()
                Image(systemName: "arrow.up.right")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(Theme.C.ink3)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
    }

    // MARK: App info

    private var appInfoSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            MarkerTitle(text: "アプリ情報", size: 22)
                .padding(.leading, 4)

            PaperCard {
                VStack(spacing: 0) {
                    infoRow(
                        label: "バージョン",
                        value: Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "—",
                    )
                    Rectangle().fill(Theme.C.line).frame(height: 1).padding(.vertical, 10)
                    infoRow(
                        label: "ビルド",
                        value: Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "—",
                    )
                }
            }
        }
    }

    private func infoRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 13))
                .foregroundStyle(Theme.C.ink3)
            Spacer()
            Text(value)
                .font(.monoCount)
                .foregroundStyle(Theme.C.ink)
        }
    }

    // MARK: Disclaimer

    private var disclaimer: some View {
        Text("問題は IPA 公開過去問より引用しています。AI 解説は Gemini / Apple Intelligence で生成されており、誤りを含む可能性があります。")
            .font(.system(size: 11))
            .foregroundStyle(Theme.C.ink3)
            .lineSpacing(3)
            .padding(.horizontal, 4)
            .padding(.top, 4)
    }
}
