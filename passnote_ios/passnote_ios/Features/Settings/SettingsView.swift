import SwiftUI

struct SettingsView: View {
    @Environment(LocalizationStore.self) private var localization
    @Environment(\.openURL) private var openURL

    var body: some View {
        @Bindable var loc = localization

        List {
            Section("言語") {
                Picker("表示言語", selection: Binding(
                    get: { loc.current },
                    set: { newValue in
                        Task { await loc.setLocale(newValue) }
                    },
                )) {
                    ForEach(AppLocale.allCases) { l in
                        Text(l.displayName).tag(l)
                    }
                }
            }

            Section("法的事項") {
                Button {
                    if let url = URL(string: "https://it-passport-steel.vercel.app/legal/privacy") {
                        openURL(url)
                    }
                } label: {
                    Label("プライバシーポリシー", systemImage: "hand.raised")
                }
                Button {
                    if let url = URL(string: "https://it-passport-steel.vercel.app/legal/terms") {
                        openURL(url)
                    }
                } label: {
                    Label("利用規約", systemImage: "doc.text")
                }
            }

            Section("アプリ情報") {
                LabeledContent("バージョン") {
                    Text(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "—")
                        .foregroundStyle(.secondary)
                }
                LabeledContent("ビルド") {
                    Text(Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "—")
                        .foregroundStyle(.secondary)
                }
            }

            Section {
                Text("問題は IPA 公開過去問より引用しています。AI 解説は Gemini / Apple Intelligence で生成されており、誤りを含む可能性があります。")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Settings")
    }
}
