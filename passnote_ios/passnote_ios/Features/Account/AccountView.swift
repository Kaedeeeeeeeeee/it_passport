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
        List {
            Section("アカウント") {
                if let p = profileStore.profile {
                    LabeledContent("メール", value: p.email ?? "(非公開)")
                    LabeledContent("プラン") {
                        statusBadge(p.subscriptionStatus, isPro: entitlement.isPro)
                    }
                    if let trial = p.trialEndsAt, p.subscriptionStatus == .trialing {
                        LabeledContent("無料トライアル終了") {
                            Text(trial, style: .date).foregroundStyle(.secondary)
                        }
                    }
                    if let end = p.currentPeriodEnd, entitlement.isPro {
                        LabeledContent("次回更新") {
                            Text(end, style: .date).foregroundStyle(.secondary)
                        }
                    }
                } else if profileStore.isLoading {
                    HStack {
                        ProgressView()
                        Text("読み込み中…").foregroundStyle(.secondary)
                    }
                } else if let err = profileStore.lastError {
                    Text(err).font(.footnote).foregroundStyle(.red)
                }
            }

            crossRailSection

            if !entitlement.isPro {
                Section {
                    Button {
                        showPaywall = true
                    } label: {
                        Label("Pro にアップグレード", systemImage: "sparkles")
                            .frame(maxWidth: .infinity)
                    }
                }
            }

            Section {
                Button("購入を復元") {
                    Task { await storeKit.restorePurchases() }
                }
            }

            Section {
                Button(role: .destructive) {
                    Task { await signOut() }
                } label: {
                    if signingOut {
                        HStack {
                            ProgressView()
                            Text("ログアウト中…")
                        }
                    } else {
                        Text("ログアウト")
                    }
                }
                .disabled(signingOut)
            }
        }
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

    @ViewBuilder
    private var crossRailSection: some View {
        switch entitlement.managedAt {
        case .appStore:
            Section {
                Button {
                    showManageSubscription = true
                } label: {
                    Label("App Store で管理", systemImage: "applelogo")
                }
            } footer: {
                Text("このサブスクリプションは App Store 経由で購入されました。")
            }
        case .web:
            Section {
                Button {
                    if let url = URL(string: "https://it-passport-steel.vercel.app/account") {
                        openURL(url)
                    }
                } label: {
                    Label("Web で管理", systemImage: "globe")
                }
            } footer: {
                Text("このサブスクリプションは Web (Stripe) で購入されました。")
            }
        case .both:
            Section {
                Button {
                    showManageSubscription = true
                } label: {
                    Label("App Store で管理", systemImage: "applelogo")
                }
            } footer: {
                Text("⚠️ Apple と Web の両方に有効なサブスクリプションがあります。重複課金を避けるため、片方を解約してください。")
            }
        case .neither:
            EmptyView()
        }
    }

    private func statusBadge(_ s: BillingStatus, isPro: Bool) -> some View {
        let (label, tint): (String, Color) = {
            switch s {
            case .active: ("Pro", Color.accentColor)
            case .trialing: ("トライアル", .orange)
            case .pastDue: ("支払い遅延", .red)
            case .canceled: ("解約済み", .secondary)
            case .free: (isPro ? "Pro (Apple)" : "無料", isPro ? .green : .secondary)
            }
        }()
        return Text(label)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .foregroundStyle(isPro ? .white : tint)
            .background(isPro ? tint : tint.opacity(0.12), in: .capsule)
    }

    private func signOut() async {
        signingOut = true
        defer { signingOut = false }
        await AuthClient.shared.signOut()
        profileStore.clear()
    }
}
