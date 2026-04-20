export type Era = "reiwa" | "heisei";
export type Season = "annual" | "spring" | "autumn" | "october" | "special";
export type Category = "strategy" | "management" | "technology" | "integrated";
export type ChoiceLetter = "ア" | "イ" | "ウ" | "エ";
export type ChoiceFormat =
  | "vertical"
  | "inline"
  | "table_combo"
  | "table_single"
  | "figure_choices"
  | "see_figure";

export type Figure = {
  path: string; // "figures/<exam>/<file>.jpeg" — relative to /public
  type: string | null;
  description: string | null;
};

export type Question = {
  id: string;
  exam_code: string;
  year: number;
  era: Era;
  era_year: number;
  season: Season;
  number: number;
  category: Category | null;
  question: string;
  choices: Partial<Record<ChoiceLetter, string>>;
  answer: string; // "ア" or multi "ア/ウ"
  figures: Figure[];
  choice_format: ChoiceFormat;
  integrated_group_id: string | null;
  integrated_context: string | null;
  source_pdf: string;
};
