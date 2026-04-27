import Foundation
import Observation
import StoreKit

enum ProProduct: String, CaseIterable {
    case monthly = "com.shera.passnote.pro.monthly"
    case yearly = "com.shera.passnote.pro.yearly"
}

/// StoreKit 2 wrapper. Loads products, listens for transaction updates,
/// drives the purchase flow, and exposes a snapshot of the current
/// auto-renewable entitlement. After a successful purchase we also POST
/// `/api/iap/link` so the backend can record the originalTransactionId on
/// the user's profile (cross-rail Pro recognition).
@MainActor
@Observable
final class StoreKitController {
    private(set) var products: [Product] = []
    private(set) var purchaseInProgress: ProProduct?
    private(set) var purchaseError: String?
    private(set) var hasActiveStoreKitEntitlement: Bool = false
    private(set) var entitledOriginalTransactionId: UInt64?

    private var listener: Task<Void, Never>?

    func bootstrap() {
        listener?.cancel()
        listener = Task { [weak self] in
            for await update in Transaction.updates {
                await self?.handle(update)
            }
        }
        Task {
            await loadProducts()
            await refreshEntitlement()
        }
    }

    // MARK: - Products

    func loadProducts() async {
        do {
            let ids = ProProduct.allCases.map(\.rawValue)
            products = try await Product.products(for: ids)
        } catch {
            print("[StoreKit] product load failed: \(error)")
        }
    }

    func product(_ id: ProProduct) -> Product? {
        products.first(where: { $0.id == id.rawValue })
    }

    // MARK: - Purchase

    func purchase(_ id: ProProduct) async {
        purchaseError = nil
        guard let product = product(id) else {
            purchaseError = "商品が見つかりません"
            return
        }
        purchaseInProgress = id
        defer { purchaseInProgress = nil }

        do {
            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                let transaction = try Self.verified(verification)
                await transaction.finish()
                await linkToServer(
                    originalTransactionId: transaction.originalID,
                    jws: verification.jwsRepresentation,
                )
                await refreshEntitlement()
            case .userCancelled:
                break
            case .pending:
                purchaseError = "保留中。承認後に有効になります。"
            @unknown default:
                purchaseError = "未知の状態"
            }
        } catch {
            purchaseError = error.localizedDescription
        }
    }

    func restorePurchases() async {
        try? await AppStore.sync()
        await refreshEntitlement()
    }

    // MARK: - Entitlement snapshot

    func refreshEntitlement() async {
        var active: UInt64? = nil
        for await result in Transaction.currentEntitlements {
            guard case .verified(let t) = result else { continue }
            guard t.productType == .autoRenewable, t.revocationDate == nil else { continue }
            if let exp = t.expirationDate, exp < .now { continue }
            active = t.originalID
            break
        }
        self.hasActiveStoreKitEntitlement = active != nil
        self.entitledOriginalTransactionId = active
    }

    // MARK: - Internal

    private func handle(_ update: VerificationResult<Transaction>) async {
        guard case .verified(let t) = update else { return }
        await t.finish()
        await refreshEntitlement()
        if t.revocationDate == nil {
            await linkToServer(
                originalTransactionId: t.originalID,
                jws: update.jwsRepresentation,
            )
        }
    }

    private func linkToServer(originalTransactionId otid: UInt64, jws: String) async {
        let body = LinkBody(
            originalTransactionId: String(otid),
            jwsRepresentation: jws,
        )
        do {
            _ = try await APIClient.shared.postVoid(
                "/api/iap/link", body: body,
            )
        } catch {
            print("[StoreKit] /api/iap/link failed: \(error)")
        }
    }

    private static func verified<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .verified(let value): return value
        case .unverified(_, let error): throw error
        }
    }

    struct LinkBody: Encodable, Sendable {
        let originalTransactionId: String
        let jwsRepresentation: String
    }
}
