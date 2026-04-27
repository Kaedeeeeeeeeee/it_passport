import WidgetKit
import SwiftUI

@main
struct PassnoteWidgetBundle: WidgetBundle {
    var body: some Widget {
        TodayQuestionWidget()
        StreakWidget()
        ExamCountdownWidget()
        ExamLiveActivity()
    }
}
