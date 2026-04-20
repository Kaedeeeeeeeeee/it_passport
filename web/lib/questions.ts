import raw from "@/data/questions.json";
import type {
  Category,
  ChoiceLetter,
  Question,
  Season,
} from "./types";

const all = raw as Question[];

export const allQuestions: readonly Question[] = all;

export const questionById = new Map<string, Question>(
  all.map((q) => [q.id, q]),
);

export const examCodes: string[] = Array.from(
  new Set(all.map((q) => q.exam_code)),
).sort();

export type ExamSummary = {
  exam_code: string;
  year: number;
  season: Season;
  count: number;
};

export const exams: ExamSummary[] = examCodes.map((code) => {
  const first = all.find((q) => q.exam_code === code)!;
  return {
    exam_code: code,
    year: first.year,
    season: first.season,
    count: all.filter((q) => q.exam_code === code).length,
  };
});

export function questionsForExam(examCode: string): Question[] {
  return all.filter((q) => q.exam_code === examCode);
}

export function questionsByCategory(
  category: Category,
  examCode?: string,
): Question[] {
  return all.filter(
    (q) =>
      q.category === category && (examCode ? q.exam_code === examCode : true),
  );
}

export function integratedGroupMembers(groupId: string): Question[] {
  return all
    .filter((q) => q.integrated_group_id === groupId)
    .sort((a, b) => a.number - b.number);
}

export function sample<T>(items: T[], n: number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, n);
}

export const CHOICE_LETTERS: ChoiceLetter[] = ["ア", "イ", "ウ", "エ"];
