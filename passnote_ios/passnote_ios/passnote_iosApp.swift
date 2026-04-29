//
//  passnote_iosApp.swift
//  passnote_ios
//
//  Created by USER on 2026/04/26.
//

import SwiftUI
import SwiftData

@main
struct passnote_iosApp: App {
    @State private var bank = QuestionBank()
    @State private var session = SessionStore()
    @State private var profileStore: ProfileStore
    @State private var storeKit = StoreKitController()
    @State private var entitlement: EntitlementStore
    @State private var localization = LocalizationStore()

    @AppStorage("passnote.onboardingComplete") private var onboardingComplete = false

    init() {
        FontRegistrar.register()
        let p = ProfileStore()
        let sk = StoreKitController()
        _profileStore = State(initialValue: p)
        _storeKit = State(initialValue: sk)
        _entitlement = State(initialValue: EntitlementStore(profile: p, storeKit: sk))
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if !onboardingComplete {
                    OnboardingView { onboardingComplete = true }
                } else {
                    AppRootView()
                }
            }
            .environment(bank)
            .environment(session)
            .environment(profileStore)
            .environment(storeKit)
            .environment(entitlement)
            .environment(localization)
            .tint(Theme.C.accent)
            .preferredColorScheme(.light)
            .task {
                session.bootstrap()
                storeKit.bootstrap()
                await bank.load()
            }
            .onChange(of: session.status) { _, newValue in
                Task {
                    switch newValue {
                    case .signedIn:
                        await profileStore.refresh()
                        if let profile = profileStore.profile {
                            localization.adoptServerPreference(profile.preferredLanguage)
                        }
                    case .signedOut, .loading:
                        profileStore.clear()
                    }
                }
            }
            .onOpenURL { url in
                Task { await AuthClient.shared.handleOpenURL(url) }
            }
        }
        .modelContainer(for: [Attempt.self, StudySession.self])
    }
}

private struct AppRootView: View {
    @Environment(SessionStore.self) private var session

    var body: some View {
        switch session.status {
        case .loading:
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        case .signedOut:
            NavigationStack {
                LoginView()
            }
        case .signedIn:
            RootView()
        }
    }
}
