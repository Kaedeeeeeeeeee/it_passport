import SwiftUI
import StoreKit

struct PricingSheet: View {
    @Environment(StoreKitController.self) private var storeKit
    @Environment(EntitlementStore.self) private var entitlement
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                header
                benefitsList
                if entitlement.isPro {
                    alreadyProBadge
                } else {
                    purchaseButtons
                    legalLinks
                }
            }
            .padding(24)
        }
        .paperBackground()
        .presentationDetents([.medium, .large])
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("閉じる") { dismiss() }
                    .foregroundStyle(Theme.C.ink2)
            }
        }
        .task {
            if storeKit.products.isEmpty {
                await storeKit.loadProducts()
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: "sparkles")
                    .foregroundStyle(.white)
                    .font(.system(size: 14, weight: .semibold))
                    .frame(width: 28, height: 28)
                    .background(Theme.C.accent, in: RoundedRectangle(cornerRadius: Theme.R.small))
                MarkerTitle(text: "Pro", size: 32)
            }
            Text("¥980 / 月 または年額プラン")
                .font(.bodyText)
                .foregroundStyle(Theme.C.ink2)
        }
    }

    private var benefitsList: some View {
        VStack(alignment: .leading, spacing: 14) {
            benefit("doc.text.magnifyingglass", "本番同形式の模擬試験 (100 問 / 100 分)")
            benefit("arrow.uturn.backward", "間違えた問題を集中復習")
            benefit("chart.bar.xaxis", "進捗ダッシュボード")
            benefit("sparkles", "AI 解説（多言語対応）")
            benefit("icloud.and.arrow.up", "クロスデバイス同期")
        }
    }

    @ViewBuilder
    private var purchaseButtons: some View {
        VStack(spacing: 10) {
            ForEach(ProProduct.allCases, id: \.rawValue) { id in
                if let product = storeKit.product(id) {
                    purchaseButton(id: id, product: product)
                }
            }
            if storeKit.products.isEmpty {
                ProgressView("商品情報を読み込み中…")
                    .padding(.vertical, 12)
                    .tint(Theme.C.accent)
            }
            if let err = storeKit.purchaseError {
                Text(err)
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.C.wrong)
            }
            Button("購入を復元") {
                Task { await storeKit.restorePurchases() }
            }
            .buttonStyle(.ghost)
            .padding(.top, 4)
        }
    }

    private func purchaseButton(id: ProProduct, product: Product) -> some View {
        let inProgress = storeKit.purchaseInProgress == id
        let isYearly = id == .yearly
        return Button {
            Task { await storeKit.purchase(id) }
        } label: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(label(for: id))
                        .font(.system(size: 15, weight: .semibold))
                    if isYearly {
                        Text("年払いで約 17% 節約")
                            .font(.system(size: 11))
                            .opacity(0.85)
                    }
                }
                Spacer()
                if inProgress {
                    ProgressView().tint(.white)
                } else {
                    Text(product.displayPrice)
                        .font(.system(size: 15, weight: .semibold).monospacedDigit())
                }
            }
            .foregroundStyle(.white)
            .padding(.horizontal, 18)
            .padding(.vertical, 16)
            .frame(maxWidth: .infinity)
            .background(
                isYearly ? Theme.C.accent : Theme.C.accentInk,
                in: RoundedRectangle(cornerRadius: Theme.R.button)
            )
        }
        .buttonStyle(.plain)
        .disabled(storeKit.purchaseInProgress != nil)
    }

    private var alreadyProBadge: some View {
        HStack(spacing: 10) {
            Image(systemName: "checkmark.seal.fill")
                .foregroundStyle(Theme.C.correct)
                .font(.system(size: 18))
            Text("Pro 加入中")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(Theme.C.ink)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 18)
        .background(Theme.C.accentSoft, in: RoundedRectangle(cornerRadius: Theme.R.card))
    }

    private var legalLinks: some View {
        Text("購入後、Apple ID への自動更新で課金されます。設定 → Apple ID → サブスクリプションでいつでも解約できます。")
            .font(.system(size: 11))
            .foregroundStyle(Theme.C.ink3)
            .lineSpacing(2)
    }

    private func label(for id: ProProduct) -> String {
        switch id {
        case .monthly: "月額プラン"
        case .yearly: "年額プラン"
        }
    }

    @ViewBuilder
    private func benefit(_ icon: String, _ text: LocalizedStringKey) -> some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundStyle(Theme.C.accentInk)
                .frame(width: 32, height: 32)
                .background(Theme.C.accentSoft, in: RoundedRectangle(cornerRadius: Theme.R.small))
            Text(text)
                .font(.bodyText)
                .foregroundStyle(Theme.C.ink)
        }
    }
}
