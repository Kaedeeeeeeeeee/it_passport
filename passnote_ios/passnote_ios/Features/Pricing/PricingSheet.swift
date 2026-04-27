import SwiftUI
import StoreKit

struct PricingSheet: View {
    @Environment(StoreKitController.self) private var storeKit
    @Environment(EntitlementStore.self) private var entitlement
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
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
        .presentationDetents([.medium, .large])
        .presentationBackground(.regularMaterial)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("閉じる") { dismiss() }
            }
        }
        .task {
            if storeKit.products.isEmpty {
                await storeKit.loadProducts()
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Pro").font(.largeTitle.weight(.bold))
            Text("¥980 / 月 または年額プラン")
                .font(.title3)
                .foregroundStyle(.secondary)
        }
    }

    private var benefitsList: some View {
        VStack(alignment: .leading, spacing: 12) {
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
            }
            if let err = storeKit.purchaseError {
                Text(err).font(.footnote).foregroundStyle(.red)
            }
            Button("購入を復元") {
                Task { await storeKit.restorePurchases() }
            }
            .font(.footnote)
            .foregroundStyle(.secondary)
        }
    }

    private func purchaseButton(id: ProProduct, product: Product) -> some View {
        let inProgress = storeKit.purchaseInProgress == id
        return Button {
            Task { await storeKit.purchase(id) }
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(label(for: id))
                        .font(.body.weight(.semibold))
                    if let savings = id == .yearly ? "年払いで約 17% 節約" : nil {
                        Text(savings)
                            .font(.caption)
                            .opacity(0.85)
                    }
                }
                Spacer()
                if inProgress {
                    ProgressView().tint(.white)
                } else {
                    Text(product.displayPrice)
                        .font(.body.weight(.semibold))
                }
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.large)
        .disabled(storeKit.purchaseInProgress != nil)
    }

    private var alreadyProBadge: some View {
        Label("Pro 加入中", systemImage: "checkmark.seal.fill")
            .font(.body.weight(.semibold))
            .foregroundStyle(.green)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(.green.opacity(0.10), in: .rect(cornerRadius: 12))
    }

    private var legalLinks: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("購入後、Apple ID への自動更新で課金されます。設定 → Apple ID → サブスクリプションでいつでも解約できます。")
                .font(.caption2)
                .foregroundStyle(.tertiary)
        }
    }

    private func label(for id: ProProduct) -> String {
        switch id {
        case .monthly: "月額プラン"
        case .yearly: "年額プラン"
        }
    }

    @ViewBuilder
    private func benefit(_ icon: String, _ text: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .frame(width: 28)
                .foregroundStyle(Color.accentColor)
            Text(text)
                .font(.callout)
        }
    }
}
