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
        VStack(alignment: .leading, spacing: 24) {
            VStack(alignment: .leading, spacing: 8) {
                Text("ようこそ")
                    .font(.largeTitle.weight(.semibold))
                Text("サインインして進捗を端末間で同期")
                    .foregroundStyle(.secondary)
            }
            .padding(.top, 32)

            VStack(spacing: 12) {
                magicLinkSection
                Divider().padding(.vertical, 4)
                appleButton
                googleButton
            }

            if case .sent(let mail) = status {
                Text("\(mail) にログインリンクを送りました。受信トレイをご確認ください。")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            if case .error(let msg) = status {
                Text(msg)
                    .font(.footnote)
                    .foregroundStyle(.red)
            }

            Spacer()
        }
        .padding(24)
        .navigationTitle("Sign in")
        .navigationBarTitleDisplayMode(.inline)
    }

    // MARK: Magic link

    private var magicLinkSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("メールでログイン")
                .font(.subheadline.weight(.medium))
            TextField("you@example.com", text: $email)
                .textFieldStyle(.roundedBorder)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()

            Button {
                Task { await sendMagicLink() }
            } label: {
                HStack {
                    if status == .sending {
                        ProgressView().tint(.white)
                    } else {
                        Image(systemName: "envelope.fill")
                    }
                    Text("ログインリンクを送る")
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 4)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(email.isEmpty || status == .sending)
        }
    }

    private func sendMagicLink() async {
        status = .sending
        do {
            try await AuthClient.shared.sendMagicLink(email: email)
            status = .sent(email)
        } catch {
            status = .error(error.localizedDescription)
        }
    }

    // MARK: Apple

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
        .frame(height: 50)
        .clipShape(.rect(cornerRadius: 12))
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

    // MARK: Google

    private var googleButton: some View {
        Button {
            Task { await signInGoogle() }
        } label: {
            HStack(spacing: 10) {
                Image(systemName: "g.circle.fill")
                    .font(.title3)
                Text("Google で続ける")
                    .font(.subheadline.weight(.medium))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Color(.tertiarySystemBackground), in: .rect(cornerRadius: 12))
            .overlay {
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color(.separator), lineWidth: 1)
            }
        }
        .buttonStyle(.plain)
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
