import Foundation

/// Public-safe configuration. The Supabase anon key is JWT-signed for the
/// `anon` role and is meant to ship to clients — same key powers the web app.
/// `apiBaseURL` switches by build config: Debug points at local `next dev`,
/// Release at production.
enum Config: Sendable {
    static let supabaseURL = URL(string: "https://iarbapnfdfvqubwnfgsk.supabase.co")!

    static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhcmJhcG5mZGZ2cXVid25mZ3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NTA5OTMsImV4cCI6MjA5MjIyNjk5M30.je7Yq5dn1ZdzOEvl5So6QrLmexB3JzjJP8PVHDTVcMc"

    static var apiBaseURL: URL {
        #if DEBUG
        return URL(string: "http://localhost:3000")!
        #else
        return URL(string: "https://it-passport-steel.vercel.app")!
        #endif
    }

    /// OAuth callback URL. Must match the URL Scheme registered in Info.plist
    /// (`passnote`) and be added to Supabase Dashboard's "Redirect URLs"
    /// allowlist for both Magic Link and Google OAuth.
    static let oauthRedirectURL = URL(string: "passnote://auth/callback")!
}
