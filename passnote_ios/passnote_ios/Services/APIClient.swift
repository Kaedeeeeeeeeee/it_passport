import Foundation

enum APIError: Error, LocalizedError {
    case http(status: Int, body: String)
    case decoding(Error)
    case transport(Error)

    var errorDescription: String? {
        switch self {
        case .http(let status, let body): "HTTP \(status): \(body)"
        case .decoding(let e): "decode: \(e.localizedDescription)"
        case .transport(let e): "transport: \(e.localizedDescription)"
        }
    }
}

/// Thin wrapper over URLSession that always attaches the Supabase access
/// token as `Authorization: Bearer <jwt>`. The web side accepts both cookie
/// and Bearer auth — `web/lib/supabase/server.ts:userFromRequest`.
actor APIClient {
    static let shared = APIClient()

    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        return d
    }()
    private let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        return e
    }()

    func get<R: Decodable>(_ path: String, as: R.Type = R.self) async throws -> R {
        try await send(method: "GET", path: path, body: Empty?.none)
    }

    func post<B: Encodable, R: Decodable>(
        _ path: String, body: B, as: R.Type = R.self,
    ) async throws -> R {
        try await send(method: "POST", path: path, body: body)
    }

    @discardableResult
    func postVoid<B: Encodable>(_ path: String, body: B) async throws -> Data {
        try await sendRaw(method: "POST", path: path, body: body)
    }

    // MARK: Internal

    private func send<B: Encodable, R: Decodable>(
        method: String, path: String, body: B?,
    ) async throws -> R {
        let data = try await sendRaw(method: method, path: path, body: body)
        do {
            return try decoder.decode(R.self, from: data)
        } catch {
            throw APIError.decoding(error)
        }
    }

    private func sendRaw<B: Encodable>(
        method: String, path: String, body: B?,
    ) async throws -> Data {
        var url = Config.apiBaseURL
        url.append(path: path)
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if let token = await AuthClient.shared.accessToken() {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body, !(body is Empty?) {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try encoder.encode(body)
        }
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: req)
        } catch {
            throw APIError.transport(error)
        }
        guard let http = response as? HTTPURLResponse else {
            throw APIError.transport(URLError(.badServerResponse))
        }
        guard (200..<300).contains(http.statusCode) else {
            let body = String(data: data, encoding: .utf8) ?? ""
            throw APIError.http(status: http.statusCode, body: body)
        }
        return data
    }
}

private struct Empty: Encodable, Sendable {}
