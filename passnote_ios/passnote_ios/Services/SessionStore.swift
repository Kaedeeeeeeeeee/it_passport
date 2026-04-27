import Foundation
import Observation
import Supabase

@MainActor
@Observable
final class SessionStore {
    enum Status: Equatable {
        case loading
        case signedOut
        case signedIn(userId: String, email: String?)
    }

    private(set) var status: Status = .loading
    private var observerTask: Task<Void, Never>?

    init() {}

    var isSignedIn: Bool {
        if case .signedIn = status { return true }
        return false
    }

    var userId: String? {
        if case .signedIn(let id, _) = status { return id }
        return nil
    }

    /// Start observing Supabase auth state. Called once at app launch.
    func bootstrap() {
        observerTask?.cancel()
        observerTask = Task { @MainActor [weak self] in
            // Initial state from cached session (if any).
            if let session = try? await AuthClient.shared.supabase.auth.session {
                self?.status = .signedIn(
                    userId: session.user.id.uuidString,
                    email: session.user.email,
                )
            } else {
                self?.status = .signedOut
            }

            // Live subscription for sign-in / sign-out / token refresh events.
            for await change in AuthClient.shared.supabase.auth.authStateChanges {
                guard let self else { return }
                switch change.event {
                case .signedIn, .tokenRefreshed, .userUpdated, .initialSession:
                    if let session = change.session {
                        self.status = .signedIn(
                            userId: session.user.id.uuidString,
                            email: session.user.email,
                        )
                    }
                case .signedOut, .userDeleted:
                    self.status = .signedOut
                default:
                    break
                }
            }
        }
    }
}
