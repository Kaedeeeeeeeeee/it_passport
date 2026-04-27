import Foundation
import Observation

/// Mirrors the `GET /api/me` response shape (web/app/api/me/route.ts).
struct AppProfile: Codable, Equatable, Sendable {
    let id: String
    let email: String
    let subscriptionStatus: BillingStatus
    let trialEndsAt: Date?
    let currentPeriodEnd: Date?
    let preferredLanguage: String?
    let hasStripeLink: Bool
    let hasAppStoreLink: Bool
}

enum BillingStatus: String, Codable, Sendable {
    case free
    case trialing
    case active
    case pastDue = "past_due"
    case canceled
}

extension AppProfile {
    /// Pro is unlocked while the cloud-side status is in {trialing, active}.
    /// (Local StoreKit entitlement is OR-ed on top in W5.)
    var isPro: Bool {
        switch subscriptionStatus {
        case .trialing, .active: true
        default: false
        }
    }
}

/// Holds the latest profile fetched from `/api/me`. Drives Pro gating UI.
@MainActor
@Observable
final class ProfileStore {
    private(set) var profile: AppProfile?
    private(set) var isLoading = false
    private(set) var lastError: String?

    func refresh() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let p: AppProfile = try await APIClient.shared.get("/api/me")
            self.profile = p
            self.lastError = nil
        } catch {
            self.lastError = error.localizedDescription
        }
    }

    func clear() {
        profile = nil
        lastError = nil
    }
}
