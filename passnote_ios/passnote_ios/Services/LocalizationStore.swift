import Foundation
import Observation
import SwiftUI

enum AppLocale: String, CaseIterable, Identifiable, Sendable {
    case ja
    case zh = "zh-Hans"
    case en

    var id: String { rawValue }

    /// Web sends "zh" / "ja" / "en"; we use Apple's "zh-Hans" internally.
    /// Map to the value the `/api/locale` endpoint expects.
    var apiValue: String {
        switch self {
        case .ja: "ja"
        case .zh: "zh"
        case .en: "en"
        }
    }

    var displayName: String {
        switch self {
        case .ja: "日本語"
        case .zh: "简体中文"
        case .en: "English"
        }
    }

    static func fromApiValue(_ s: String?) -> AppLocale? {
        switch s {
        case "ja": .ja
        case "zh", "zh-Hans": .zh
        case "en": .en
        default: nil
        }
    }
}

/// Holds the user's preferred app locale.
///
/// Resolution order on launch:
///   1. `UserDefaults` ("passnote.locale")
///   2. `profiles.preferred_language` from `/api/me` after sign-in
///   3. Device locale
///
/// On change, mirror to UserDefaults locally + POST `/api/locale` so the
/// web app picks up the same preference on next visit.
@MainActor
@Observable
final class LocalizationStore {
    private let defaultsKey = "passnote.locale"
    private(set) var current: AppLocale

    init() {
        if let raw = UserDefaults.standard.string(forKey: defaultsKey),
           let saved = AppLocale(rawValue: raw) {
            self.current = saved
        } else if let device = AppLocale.fromApiValue(
            Locale.current.language.languageCode?.identifier,
        ) {
            self.current = device
        } else {
            self.current = .ja
        }
    }

    /// After sign-in we may discover a `preferred_language` on the server.
    /// Honour it only if the user hasn't already set a local override.
    func adoptServerPreference(_ raw: String?) {
        guard UserDefaults.standard.string(forKey: defaultsKey) == nil,
              let server = AppLocale.fromApiValue(raw) else { return }
        current = server
    }

    /// User picked a language. Persist locally and mirror to web.
    func setLocale(_ locale: AppLocale) async {
        current = locale
        UserDefaults.standard.set(locale.rawValue, forKey: defaultsKey)
        struct Body: Encodable { let locale: String }
        do {
            _ = try await APIClient.shared.postVoid(
                "/api/locale", body: Body(locale: locale.apiValue),
            )
        } catch {
            print("[LocalizationStore] /api/locale sync failed: \(error)")
        }
    }
}
