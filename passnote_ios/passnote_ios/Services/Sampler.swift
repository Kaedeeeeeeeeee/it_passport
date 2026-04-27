import Foundation

extension Array {
    /// Pick `n` random elements without replacement. Mirrors the Fisher-Yates
    /// `sample` helper in `web/lib/questions.ts`. If `n >= count`, returns
    /// the whole array shuffled.
    func sampled(_ n: Int) -> [Element] {
        guard n > 0 else { return [] }
        if n >= count { return shuffled() }
        return Array(shuffled().prefix(n))
    }
}
