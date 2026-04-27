import Foundation
import Observation

@MainActor
@Observable
final class QuestionBank {
    private(set) var allQuestions: [Question] = []
    private(set) var byId: [String: Question] = [:]
    private(set) var byExam: [String: [Question]] = [:]
    private(set) var byCategory: [QuestionCategory: [Question]] = [:]

    private(set) var examCodesSorted: [String] = []
    private(set) var loaded = false
    private(set) var loadError: String?

    init() {}

    func load() async {
        guard !loaded else { return }

        let questions: [Question] = await Task.detached(priority: .userInitiated) {
            guard let url = Bundle.main.url(forResource: "questions", withExtension: "json") else {
                return []
            }
            do {
                let data = try Data(contentsOf: url)
                return try JSONDecoder().decode([Question].self, from: data)
            } catch {
                return []
            }
        }.value

        guard !questions.isEmpty else {
            self.loadError = "questions.json missing or empty in bundle"
            return
        }

        self.allQuestions = questions
        self.byId = Dictionary(uniqueKeysWithValues: questions.map { ($0.id, $0) })
        self.byExam = Dictionary(grouping: questions, by: \.examCode)
        var cats: [QuestionCategory: [Question]] = [:]
        for q in questions {
            if let c = q.category { cats[c, default: []].append(q) }
        }
        self.byCategory = cats
        self.examCodesSorted = self.byExam.keys.sorted(by: >)
        self.loaded = true
    }
}
