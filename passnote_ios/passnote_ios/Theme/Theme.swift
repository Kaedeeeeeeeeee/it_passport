import SwiftUI

/// Design tokens mirroring the web app's CSS custom properties.
/// All hex values defined in `Assets.xcassets/Colors/*.colorset`.
enum Theme {
    enum C {
        static let paper        = Color("Paper")
        static let surface      = Color("Surface")
        static let surface2     = Color("Surface2")
        static let accent       = Color("Accent")
        static let accentInk    = Color("AccentInk")
        static let accentSoft   = Color("AccentSoft")
        static let accentMuted  = Color("AccentMuted")
        static let ink          = Color("Ink")
        static let ink2         = Color("Ink2")
        static let ink3         = Color("Ink3")
        static let line         = Color("Line")
        static let lineStrong   = Color("LineStrong")
        static let correct      = Color("Correct")
        static let wrong        = Color("Wrong")
        static let flag         = Color("Flag")
        static let markerYellow = Color("MarkerYellow")
    }

    enum R {
        static let card: CGFloat   = 10
        static let button: CGFloat = 10
        static let chip: CGFloat   = 999
        static let small: CGFloat  = 6
    }

    enum S {
        static let cardPad: CGFloat = 20
        static let rowPadV: CGFloat = 14
        static let rowPadH: CGFloat = 16
    }
}
