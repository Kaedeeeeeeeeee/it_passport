import SwiftUI
import CoreText

extension Font {
    /// Noto Serif JP SemiBold — used for hero/section titles.
    /// Falls back to system serif if the bundled font fails to register.
    static func serif(_ size: CGFloat) -> Font {
        .custom("NotoSerifJP-SemiBold", size: size)
            .weight(.semibold)
    }

    /// Body text — SF Pro at the web's ~15px reading size.
    static let bodyText = Font.system(size: 15, weight: .regular)
    static let bodyTextLarge = Font.system(size: 16, weight: .regular)

    /// Monospace digits — for counters like "01 / 20".
    static let monoCount = Font.system(size: 12, weight: .medium, design: .monospaced)

    /// Small all-caps label — mirrors web `.t-label` (11px, uppercase, tracked).
    static let tLabel = Font.system(size: 11, weight: .medium)
}

/// Belt-and-suspenders custom-font registration. Info.plist's `UIAppFonts`
/// expects the font at the bundle root, but with Xcode 16 synced folders
/// the file lives under `Resources/Fonts/`. This call uses `Bundle.url`
/// (recursive search) and registers via Core Text — works regardless of
/// where the file lands in the bundle.
enum FontRegistrar {
    static func register() {
        let names = ["NotoSerifJP-SemiBold"]
        for name in names {
            guard let url = Bundle.main.url(forResource: name, withExtension: "otf") else {
                #if DEBUG
                print("⚠️ Font not found in bundle: \(name).otf")
                #endif
                continue
            }
            var error: Unmanaged<CFError>?
            CTFontManagerRegisterFontsForURL(url as CFURL, .process, &error)
            // A "duplicate" error is fine — Info.plist may have already loaded it.
        }
    }
}
