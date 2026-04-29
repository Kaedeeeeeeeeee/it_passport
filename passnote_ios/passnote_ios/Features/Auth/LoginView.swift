import SwiftUI
import AuthenticationServices
import CryptoKit

struct LoginView: View {
    @State private var email = ""
    @State private var status: Status = .idle
    @State private var nonceForApple = ""

    enum Status: Equatable {
        case idle
        case sending
        case sent(String)
        case error(String)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                header
                magicLinkSection
                divider
                socialButtons
                statusFooter
                Spacer(minLength: 32)
            }
            .padding(.horizontal, 24)
            .padding(.top, 24)
            .padding(.bottom, 40)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .paperBackground()
        .navigationTitle("Sign in")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: Header

    private var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            MarkerTitle(text: "ようこそ", size: 32)
            Text("サインインして進捗を端末間で同期")
                .font(.bodyText)
                .foregroundStyle(Theme.C.ink2)
        }
        .padding(.top, 8)
    }

    // MARK: Magic link

    private var magicLinkSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("メールでログイン")
                .font(.tLabel)
                .foregroundStyle(Theme.C.ink3)
                .textCase(.uppercase)

            TextField("you@example.com", text: $email)
                .font(.bodyText)
                .padding(.horizontal, 14)
                .padding(.vertical, 12)
                .background(Theme.C.surface, in: RoundedRectangle(cornerRadius: Theme.R.button))
                .overlay(
                    RoundedRectangle(cornerRadius: Theme.R.button)
                        .stroke(Theme.C.lineStrong, lineWidth: 1)
                )
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()

            Button {
                Task { await sendMagicLink() }
            } label: {
                HStack(spacing: 8) {
                    if status == .sending {
                        ProgressView().tint(.white)
                    } else {
                        Image(systemName: "envelope.fill")
                    }
                    Text("ログインリンクを送る")
                }
            }
            .buttonStyle(.primary(fillWidth: true))
            .disabled(email.isEmpty || status == .sending)
            .opacity(email.isEmpty || status == .sending ? 0.55 : 1.0)
        }
    }

    // MARK: Divider

    private var divider: some View {
        HStack(spacing: 12) {
            Rectangle().fill(Theme.C.line).frame(height: 1)
            Text("または")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(Theme.C.ink3)
            Rectangle().fill(Theme.C.line).frame(height: 1)
        }
    }

    // MARK: Social

    private var socialButtons: some View {
        VStack(spacing: 12) {
            appleButton
            googleButton
        }
    }

    private var appleButton: some View {
        SignInWithAppleButton(.signIn) { req in
            let nonce = randomNonce()
            nonceForApple = nonce
            req.requestedScopes = [.email]
            req.nonce = sha256(nonce)
        } onCompletion: { result in
            Task { await handleAppleResult(result) }
        }
        .signInWithAppleButtonStyle(.black)
        .frame(height: 48)
        .clipShape(RoundedRectangle(cornerRadius: Theme.R.button))
    }

    private var googleButton: some View {
        Button {
            Task { await signInGoogle() }
        } label: {
            HStack(spacing: 10) {
                Image(systemName: "g.circle.fill")
                    .font(.system(size: 18))
                Text("Google で続ける")
                    .font(.system(size: 14, weight: .medium))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .foregroundStyle(Theme.C.ink)
            .background(Theme.C.surface, in: RoundedRectangle(cornerRadius: Theme.R.button))
            .overlay {
                RoundedRectangle(cornerRadius: Theme.R.button)
                    .stroke(Theme.C.lineStrong, lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
    }

    // MARK: Status footer

    @ViewBuilder
    private var statusFooter: some View {
        if case .sent(let mail) = status {
            HStack(alignment: .top, spacing: 8) {
                Image(systemName: "envelope.open")
                    .foregroundStyle(Theme.C.accent)
                    .font(.system(size: 13))
                Text("\(mail) にログインリンクを送りました。受信トレイをご確認ください。")
                    .font(.system(size: 12))
                    .foregroundStyle(Theme.C.ink2)
                    .lineSpacing(2)
            }
            .padding(12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.C.accentSoft, in: RoundedRectangle(cornerRadius: Theme.R.card))
        }
        if case .error(let msg) = status {
            Text(msg)
                .font(.system(size: 12))
                .foregroundStyle(Theme.C.wrong)
                .padding(12)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Theme.C.wrong.opacity(0.08),
                            in: RoundedRectangle(cornerRadius: Theme.R.card))
        }
    }

    // MARK: Actions

    private func sendMagicLink() async {
        status = .sending
        do {
            try await AuthClient.shared.sendMagicLink(email: email)
            status = .sent(email)
        } catch {
            status = .error(error.localizedDescription)
        }
    }

    private func handleAppleResult(_ result: Result<ASAuthorization, Error>) async {
        switch result {
        case .failure(let error):
            status = .error(error.localizedDescription)
        case .success(let auth):
            guard
                let credential = auth.credential as? ASAuthorizationAppleIDCredential,
                let tokenData = credential.identityToken,
                let token = String(data: tokenData, encoding: .utf8)
            else {
                status = .error("Apple sign-in: missing identity token")
                return
            }
            do {
                try await AuthClient.shared.signInWithApple(
                    idToken: token, nonce: nonceForApple,
                )
            } catch {
                status = .error(error.localizedDescription)
            }
        }
    }

    private func signInGoogle() async {
        do {
            try await AuthClient.shared.signInWithGoogle()
        } catch {
            status = .error(error.localizedDescription)
        }
    }

    // MARK: Apple nonce helpers

    private func randomNonce(length: Int = 32) -> String {
        let charset: [Character] = Array(
            "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._",
        )
        var result = ""
        var bytes = [UInt8](repeating: 0, count: length)
        let status = SecRandomCopyBytes(kSecRandomDefault, length, &bytes)
        if status != errSecSuccess { return UUID().uuidString }
        for byte in bytes {
            result.append(charset[Int(byte) % charset.count])
        }
        return result
    }

    private func sha256(_ input: String) -> String {
        let data = Data(input.utf8)
        let digest = SHA256.hash(data: data)
        return digest.map { String(format: "%02x", $0) }.joined()
    }
}
