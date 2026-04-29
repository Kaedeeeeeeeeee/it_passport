import SwiftUI
import StoreKit

struct AccountView: View {
    @Environment(SessionStore.self) private var session
    @Environment(ProfileStore.self) private var profileStore
    @Environment(StoreKitController.self) private var storeKit
    @Environment(EntitlementStore.self) private var entitlement
    @Environment(\.openURL) private var openURL

    @State private var signingOut = false
    @State private var showPaywall = false
    @State private var showManageSubscription = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                accountSection
                crossRailSection
                if !entitlement.isPro {
                    upgradeButton
                }
                actionButtons
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 24)
        }
        .paperBackground()
        .navigationTitle("Account")
        .sheet(isPresented: $showPaywall) {
            PricingSheet()
        }
        .manageSubscriptionsSheet(isPresented: $showManageSubscription)
        .task {
            if profileStore.profile == nil {
                await profileStore.refresh()
            }
        }
        .refreshable {
            await profileStore.refresh()
        }
    }

    // MARK: Account info card

    @ViewBuilder
    private var accountSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            MarkerTitle(text: "アカウント", size: 22)
                .padding(.leading, 4)

            PaperCard {
                if let p = profileStore.profile {
                    VStack(alignment: .leading, spacing: 0) {
                        infoRow(label: "メール", value: p.email ?? "(非公開)")
                        divider
                        infoRow(label: "プラン") {
                            statusBadge(p.subscriptionStatus, isPro: entitlement.isPro)
                        }
                        if let trial = p.trialEndsAt, p.subscriptionStatus == .trialing {
                            divider
                            infoRow(label: "無料トライアル終了") {
                                Text(trial, style: .date)
                                    .font(.system(size: 13))
                                    .foregroundStyle(Theme.C.ink2)
                            }
                        }
                        if let end = p.currentPeriodEnd, entitlement.isPro {
                            divider
                            infoRow(label: "次回更新") {
                                Text(end, style: .date)
                                    .font(.system(size: 13))
                                    .foregroundStyle(Theme.C.ink2)
                            }
                        }
                    }
                } else if profileStore.isLoading {
                    HStack(spacing: 8) {
                        ProgressView()
                        Text("読み込み中…")
                            .font(.bodyText)
                            .foregroundStyle(Theme.C.ink3)
                    }
                } else if let err = profileStore.lastError {
                    Text(err)
                        .font(.system(size: 12))
                        .foregroundStyle(Theme.C.wrong)
                }
            }
        }
    }

    private var divider: some View {
        Rectangle()
            .fill(Theme.C.line)
            .frame(height: 1)
            .padding(.vertical, 10)
    }

    private func infoRow(label: String, value: String) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 13))
                .foregroundStyle(Theme.C.ink3)
            Spacer()
            Text(value)
                .font(.system(size: 14))
                .foregroundStyle(Theme.C.ink)
        }
    }

    private func infoRow<Trailing: View>(
        label: String,
        @ViewBuilder _ trailing: () -> Trailing,
    ) -> some View {
        HStack {
            Text(label)
                .font(.system(size: 13))
                .foregroundStyle(Theme.C.ink3)
            Spacer()
            trailing()
        }
    }

    // MARK: Cross-rail (Apple/Web subscription management)

    @ViewBuilder
    private var crossRailSection: some View {
        switch entitlement.managedAt {
        case .appStore:
            crossRailCard(
                action: { showManageSubscription = true },
                icon: "applelogo",
                title: "App Store で管理",
                footer: "このサブスクリプションは App Store 経由で購入されました。",
            )
        case .web:
            crossRailCard(
                action: {
                    if let url = URL(string: "https://it-passport-steel.vercel.app/account") {
                        openURL(url)
                    }
                },
                icon: "globe",
                title: "Web で管理",
                footer: "このサブスクリプションは Web (Stripe) で購入されました。",
            )
        case .both:
            crossRailCard(
                action: { showManageSubscription = true },
                icon: "applelogo",
                title: "App Store で管理",
                footer: "⚠️ Apple と Web の両方に有効なサブスクリプションがあります。重複課金を避けるため、片方を解約してください。",
                warning: true,
            )
        case .neither:
            EmptyView()
        }
    }

    private func crossRailCard(
        action: @escaping () -> Void,
        icon: String,
        title: LocalizedStringKey,
        footer: LocalizedStringKey,
        warning: Bool = false,
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Button(action: action) {
                HStack(spacing: 10) {
                    Image(systemName: icon)
                        .font(.system(size: 14))
                        .foregroundStyle(Theme.C.accent)
                    Text(title)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(Theme.C.ink)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundStyle(Theme.C.ink3)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 14)
                .frame(maxWidth: .infinity)
                .background(Theme.C.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: Theme.R.card)
                        .stroke(Theme.C.line, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: Theme.R.card))
            }
            .buttonStyle(.plain)

            Text(footer)
                .font(.system(size: 11))
                .foregroundStyle(warning ? Theme.C.wrong : Theme.C.ink3)
                .lineSpacing(2)
                .padding(.horizontal, 4)
        }
    }

    // MARK: Action buttons

    private var upgradeButton: some View {
        Button {
            showPaywall = true
        } label: {
            Label("Pro にアップグレード", systemImage: "sparkles")
        }
        .buttonStyle(.primary(fillWidth: true))
    }

    private var actionButtons: some View {
        VStack(spacing: 10) {
            Button {
                Task { await storeKit.restorePurchases() }
            } label: {
                Text("購入を復元")
            }
            .buttonStyle(.paperBordered)
            .frame(maxWidth: .infinity)

            Button(role: .destructive) {
                Task { await signOut() }
            } label: {
                if signingOut {
                    HStack(spacing: 8) {
                        ProgressView()
                        Text("ログアウト中…")
                    }
                } else {
                    Text("ログアウト")
                }
            }
            .buttonStyle(.ghost)
            .foregroundStyle(Theme.C.wrong)
            .frame(maxWidth: .infinity)
            .disabled(signingOut)
        }
        .padding(.top, 8)
    }

    // MARK: Status badge

    private func statusBadge(_ s: BillingStatus, isPro: Bool) -> some View {
        let (label, tint): (String, Color) = {
            switch s {
            case .active:    ("Pro", Theme.C.accent)
            case .trialing:  ("トライアル", Theme.C.flag)
            case .pastDue:   ("支払い遅延", Theme.C.wrong)
            case .canceled:  ("解約済み", Theme.C.ink3)
            case .free:      (isPro ? "Pro (Apple)" : "無料",
                              isPro ? Theme.C.accent : Theme.C.ink3)
            }
        }()
        return Text(label)
            .font(.system(size: 11, weight: .semibold))
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .foregroundStyle(isPro ? .white : tint)
            .background(isPro ? tint : tint.opacity(0.12), in: Capsule())
    }

    private func signOut() async {
        signingOut = true
        defer { signingOut = false }
        await AuthClient.shared.signOut()
        profileStore.clear()
    }
}
