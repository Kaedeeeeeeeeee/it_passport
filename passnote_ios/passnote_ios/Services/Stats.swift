import Foundation

/// Pure stats computations over the local Attempt log. Mirrors the four
/// blocks in `web/lib/stats.ts` so iOS and web report identical numbers.
enum Stats {

    struct AttemptRow: Sendable {
        let questionId: String
        let correct: Bool
        let attemptedAt: Date
    }

    struct Overview: Equatable, Sendable {
        let total: Int
        let correct: Int
        let accuracy: Double
        let seen: Int
        let mastered: Int
        let streak: Int
    }

    struct DailyBucket: Equatable, Sendable, Identifiable {
        let date: Date  // start of UTC day
        let total: Int
        let correct: Int
        var id: Date { date }
    }

    struct CategoryStat: Equatable, Sendable, Identifiable {
        let category: QuestionCategory?
        let total: Int
        let correct: Int
        let accuracy: Double
        var id: String { category?.rawValue ?? "unknown" }
    }

    struct ExamStat: Equatable, Sendable, Identifiable {
        let examCode: String
        let year: Int
        let total: Int
        let correct: Int
        let accuracy: Double
        var id: String { examCode }
    }

    // MARK: -

    static func overview(rows: [AttemptRow], now: Date = .now) -> Overview {
        let total = rows.count
        let correct = rows.lazy.filter(\.correct).count
        let accuracy = total > 0 ? Double(correct) / Double(total) : 0

        var latest: [String: AttemptRow] = [:]
        for r in rows { latest[r.questionId] = r }
        let seen = latest.count
        let mastered = latest.values.lazy.filter(\.correct).count

        // Consecutive UTC-day streak ending today.
        let cal = Calendar(identifier: .gregorian).utc
        let days = Set(rows.map { cal.startOfDay(for: $0.attemptedAt) })
        var streak = 0
        var cursor = cal.startOfDay(for: now)
        while days.contains(cursor) {
            streak += 1
            cursor = cal.date(byAdding: .day, value: -1, to: cursor) ?? cursor
        }

        return .init(
            total: total, correct: correct, accuracy: accuracy,
            seen: seen, mastered: mastered, streak: streak,
        )
    }

    static func recentDaily(
        rows: [AttemptRow], days: Int, now: Date = .now,
    ) -> [DailyBucket] {
        let cal = Calendar(identifier: .gregorian).utc
        var byDay: [Date: (total: Int, correct: Int)] = [:]
        for r in rows {
            let key = cal.startOfDay(for: r.attemptedAt)
            var cur = byDay[key] ?? (0, 0)
            cur.total += 1
            if r.correct { cur.correct += 1 }
            byDay[key] = cur
        }
        var out: [DailyBucket] = []
        var cursor = cal.startOfDay(for: now)
        for _ in 0..<days {
            let v = byDay[cursor] ?? (0, 0)
            out.append(.init(date: cursor, total: v.total, correct: v.correct))
            cursor = cal.date(byAdding: .day, value: -1, to: cursor) ?? cursor
        }
        return out.reversed()
    }

    static func byCategory(
        rows: [AttemptRow], questions: [String: Question],
    ) -> [CategoryStat] {
        var buckets: [QuestionCategory?: (total: Int, correct: Int)] = [:]
        for r in rows {
            let cat = questions[r.questionId]?.category
            var cur = buckets[cat] ?? (0, 0)
            cur.total += 1
            if r.correct { cur.correct += 1 }
            buckets[cat] = cur
        }
        return buckets.map { (cat, v) in
            .init(
                category: cat,
                total: v.total, correct: v.correct,
                accuracy: v.total > 0 ? Double(v.correct) / Double(v.total) : 0,
            )
        }
        .sorted { $0.total > $1.total }
    }

    static func byExam(
        rows: [AttemptRow], questions: [String: Question],
    ) -> [ExamStat] {
        var buckets: [String: (year: Int, total: Int, correct: Int)] = [:]
        for r in rows {
            guard let q = questions[r.questionId] else { continue }
            var cur = buckets[q.examCode] ?? (q.year, 0, 0)
            cur.year = q.year
            cur.total += 1
            if r.correct { cur.correct += 1 }
            buckets[q.examCode] = cur
        }
        return buckets.map { (code, v) in
            .init(
                examCode: code, year: v.year,
                total: v.total, correct: v.correct,
                accuracy: v.total > 0 ? Double(v.correct) / Double(v.total) : 0,
            )
        }
        .sorted { ($0.year, $1.examCode) > ($1.year, $0.examCode) }
    }
}

private extension Calendar {
    var utc: Calendar {
        var cal = self
        cal.timeZone = TimeZone(identifier: "UTC")!
        return cal
    }
}
