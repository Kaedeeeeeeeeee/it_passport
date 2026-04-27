import Foundation
import Supabase

/// Single shared SupabaseClient for the whole app. Holds Auth + Postgrest.
/// Wrapped in a final class so the Sendable check is happy.
final class AuthClient: @unchecked Sendable {
    static let shared = AuthClient()

    let supabase: SupabaseClient

    private init() {
        self.supabase = SupabaseClient(
            supabaseURL: Config.supabaseURL,
            supabaseKey: Config.supabaseAnonKey,
        )
    }

    // MARK: Sign in

    /// Magic link: Supabase emails a deep-link the user taps.
    func sendMagicLink(email: String) async throws {
        try await supabase.auth.signInWithOTP(
            email: email,
            redirectTo: Config.oauthRedirectURL,
        )
    }

    /// Google OAuth via ASWebAuthenticationSession (handled by SDK).
    func signInWithGoogle() async throws {
        _ = try await supabase.auth.signInWithOAuth(
            provider: .google,
            redirectTo: Config.oauthRedirectURL,
        )
    }

    /// Sign in with Apple — call this after `ASAuthorization` completes with
    /// the identity token + nonce produced for the request.
    func signInWithApple(idToken: String, nonce: String) async throws {
        try await supabase.auth.signInWithIdToken(
            credentials: .init(provider: .apple, idToken: idToken, nonce: nonce),
        )
    }

    /// OAuth / magic-link callback handler. Call from `.onOpenURL`.
    func handleOpenURL(_ url: URL) async {
        _ = try? await supabase.auth.session(from: url)
    }

    // MARK: Sign out

    func signOut() async {
        try? await supabase.auth.signOut()
    }

    // MARK: Token access

    /// Bearer access token for authenticated calls to `/api/*`. Returns nil
    /// when signed out. Auto-refreshes if the cached token is stale.
    func accessToken() async -> String? {
        do {
            let session = try await supabase.auth.session
            return session.accessToken
        } catch {
            return nil
        }
    }
}
