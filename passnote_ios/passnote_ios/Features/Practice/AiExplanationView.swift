import SwiftUI

struct AiExplanationView: View {
    let question: Question
    let userAnswer: String?
    let language: ExplainLanguage

    @Environment(EntitlementStore.self) private var entitlement
    @State private var client = ExplainClient()
    @State private var requested = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: "sparkles")
                    .foregroundStyle(Color.accentColor)
                Text("AI 解説")
                    .font(.subheadline.weight(.semibold))
                Spacer()
                if let badge = sourceBadge {
                    Text(badge.text)
                        .font(.caption2.weight(.semibold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .foregroundStyle(badge.tint)
                        .background(badge.tint.opacity(0.12), in: .capsule)
                }
            }

            if let result = client.results[question.id] {
                Text(result.text)
                    .font(.callout)
                    .lineSpacing(4)
                    .foregroundStyle(.primary)

                if case .onDevice = result.source, !entitlement.isPro {
                    proCTA
                }
            } else if requested && client.inFlightForQuestion == question.id {
                HStack(spacing: 8) {
                    ProgressView()
                    Text("解析中…").font(.footnote).foregroundStyle(.secondary)
                }
                .padding(.vertical, 6)
            } else {
                Button {
                    requested = true
                    Task { await client.explanation(
                        for: question, userAnswer: userAnswer, language: language,
                    ) }
                } label: {
                    Label("AI に解説をお願い", systemImage: "sparkles")
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 4)
                }
                .buttonStyle(.bordered)
                .controlSize(.regular)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial, in: .rect(cornerRadius: 12))
    }

    private var sourceBadge: (text: String, tint: Color)? {
        guard let result = client.results[question.id] else { return nil }
        switch result.source {
        case .cloudCached: return ("キャッシュ", .secondary)
        case .cloudFresh: return ("Gemini", Color.accentColor)
        case .onDevice: return ("簡易版", .orange)
        case .error: return ("エラー", .red)
        }
    }

    private var proCTA: some View {
        VStack(alignment: .leading, spacing: 6) {
            Divider().padding(.vertical, 4)
            Text("もっと詳しい解説は Pro でアンロック")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }
}
