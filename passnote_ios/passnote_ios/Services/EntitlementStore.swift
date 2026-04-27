import Foundation
import Observation

/// Computed Pro state. Folds together two billing rails:
///
///   - **Cloud (Stripe)**: `ProfileStore.profile.isPro` — populated by the
///     Stripe webhook on the web side.
///   - **Local (Apple StoreKit 2)**: `StoreKitController.hasActiveStoreKitEntitlement`.
///
/// A user is Pro if EITHER rail says yes. This is what the iOS plan calls
/// "cross-rail entitlement" — bought-on-web users see Pro on iOS, and
/// vice versa.
///
/// Debug builds also honour `DEV_FORCE_PRO=YES` env var so screens are
/// previewable before any real billing is set up.
@MainActor
@Observable
final class EntitlementStore {
    private let profile: ProfileStore
    private let storeKit: StoreKitController

    init(profile: ProfileStore, storeKit: StoreKitController) {
        self.profile = profile
        self.storeKit = storeKit
    }

    var isPro: Bool {
        #if DEBUG
        if ProcessInfo.processInfo.environment["DEV_FORCE_PRO"] == "YES" {
            return true
        }
        #endif
        if profile.profile?.isPro == true { return true }
        if storeKit.hasActiveStoreKitEntitlement { return true }
        return false
    }

    /// Where the user should go to manage their subscription. Affects the
    /// banner shown in AccountView.
    enum ManagedAt {
        case appStore
        case web
        case neither
        case both
    }

    var managedAt: ManagedAt {
        let onApple = storeKit.hasActiveStoreKitEntitlement
            || profile.profile?.hasAppStoreLink == true
        let onStripe = profile.profile?.hasStripeLink == true
        switch (onApple, onStripe) {
        case (true, true): return .both
        case (true, false): return .appStore
        case (false, true): return .web
        case (false, false): return .neither
        }
    }
}
