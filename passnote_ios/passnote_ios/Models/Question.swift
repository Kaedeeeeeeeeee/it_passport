import Foundation

enum Era: String, Codable, Hashable, CaseIterable {
    case heisei
    case reiwa
}

enum Season: String, Codable, Hashable, CaseIterable {
    case annual
    case spring
    case autumn
    case october
    case special
}

enum QuestionCategory: String, Codable, Hashable, CaseIterable {
    case strategy
    case management
    case technology
    case integrated
}

enum ChoiceFormat: String, Codable, Hashable {
    case vertical
    case inline
    case tableCombo = "table_combo"
    case tableSingle = "table_single"
    case figureChoices = "figure_choices"
    case seeFigure = "see_figure"
}

struct Figure: Codable, Hashable {
    let path: String
    let type: String?
    let description: String?
}

struct Question: Codable, Identifiable, Hashable {
    let id: String
    let examCode: String
    let year: Int
    let era: Era
    let eraYear: Int
    let season: Season
    let number: Int
    let category: QuestionCategory?
    let question: String
    let choices: [String: String]
    let answer: String
    let figures: [Figure]
    let choiceFormat: ChoiceFormat
    let integratedGroupId: String?
    let integratedContext: String?

    enum CodingKeys: String, CodingKey {
        case id
        case examCode = "exam_code"
        case year
        case era
        case eraYear = "era_year"
        case season
        case number
        case category
        case question
        case choices
        case answer
        case figures
        case choiceFormat = "choice_format"
        case integratedGroupId = "integrated_group_id"
        case integratedContext = "integrated_context"
    }
}

extension Question {
    var isMultiAnswer: Bool { answer.contains("/") }

    var answerLetters: [String] {
        answer.split(separator: "/").map(String.init)
    }
}
