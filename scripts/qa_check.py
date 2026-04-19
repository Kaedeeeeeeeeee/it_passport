"""Quality audit of the IT Passport corpus (_all.json).

Runs four checks and writes ocr_out/json/_qa_report.json:
  1. double-source answer cross-validation (pdftotext vs OCR markdown vs JSON)
  2. answer distribution histograms (global / per-exam / per-category)
  3. cross-year duplicate detection (same question, different answers)
  4. structural invariants (ids, ranges, enums, figure file existence)
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from parse_one import (  # noqa: E402
    parse_answers,
    parse_answers_from_pdf,
    parse_exam_code,
)

MD_DIR = ROOT / "ocr_out" / "markdown"
JSON_DIR = ROOT / "ocr_out" / "json"
PDF_DIR = ROOT / "download"
FIGURES_DIR = ROOT / "ocr_out" / "figures"

CHOICE_LETTERS = ["ア", "イ", "ウ", "エ"]
VALID_CATEGORIES = {"strategy", "management", "technology", "integrated"}
VALID_FORMATS = {
    "vertical", "inline", "table_combo", "table_single",
    "figure_choices", "see_figure",
}

SKEW_MIN = 15
SKEW_MAX = 40


# ---------- 1. answer cross-validation -------------------------------------


def check_answers(items: list[dict]) -> tuple[list[dict], dict]:
    """Compare answers across three sources: pdftotext, OCR md, JSON."""
    flags: list[dict] = []
    by_exam: dict[str, list[dict]] = defaultdict(list)
    for it in items:
        by_exam[it["exam_code"]].append(it)

    summary = {"exams_checked": 0, "mismatches": 0, "source_gaps": 0}
    for code, exam_items in sorted(by_exam.items()):
        summary["exams_checked"] += 1
        pdf = PDF_DIR / f"{code}_ip_ans.pdf"
        md_path = MD_DIR / f"{code}_ip_ans.md"
        pdftext_ans = parse_answers_from_pdf(pdf) if pdf.exists() else {}
        md_ans = parse_answers(md_path.read_text()) if md_path.exists() else {}
        json_ans = {it["number"]: it["answer"] for it in exam_items}

        for num in range(1, 101):
            p = pdftext_ans.get(num)
            m = md_ans.get(num)
            j = json_ans.get(num)
            sources = {"pdftext": p, "ocr_md": m, "json": j}
            present = {k: v for k, v in sources.items() if v is not None}
            if len(present) < 3:
                missing = [k for k, v in sources.items() if v is None]
                # Only flag if JSON is missing, or if both extractors disagree
                # on whether an answer exists for this number.
                if "json" in missing or (p is None) != (m is None):
                    flags.append({
                        "type": "answer_source_gap",
                        "exam_code": code,
                        "number": num,
                        "sources": sources,
                        "missing": missing,
                    })
                    summary["source_gaps"] += 1
            values = set(present.values())
            if len(values) > 1:
                flags.append({
                    "type": "answer_mismatch",
                    "exam_code": code,
                    "number": num,
                    "sources": sources,
                })
                summary["mismatches"] += 1
    return flags, summary


# ---------- 2. answer distribution -----------------------------------------


def check_distribution(items: list[dict]) -> tuple[list[dict], dict]:
    flags: list[dict] = []
    global_ctr: Counter = Counter()
    multi_answers: list[dict] = []
    by_exam: dict[str, Counter] = defaultdict(Counter)
    by_category: dict[str, Counter] = defaultdict(Counter)

    for it in items:
        ans = it.get("answer")
        if not ans:
            continue
        if "/" in ans:
            multi_answers.append({"id": it["id"], "answer": ans})
            global_ctr["multi"] += 1
            by_exam[it["exam_code"]]["multi"] += 1
            continue
        global_ctr[ans] += 1
        by_exam[it["exam_code"]][ans] += 1
        cat = it.get("category")
        if cat:
            by_category[cat][ans] += 1

    for code, ctr in by_exam.items():
        total = sum(ctr[l] for l in CHOICE_LETTERS)
        for letter in CHOICE_LETTERS:
            n = ctr[letter]
            if total and (n < SKEW_MIN or n > SKEW_MAX):
                flags.append({
                    "type": "answer_skew",
                    "exam_code": code,
                    "letter": letter,
                    "count": n,
                    "total": total,
                    "distribution": {l: ctr[l] for l in CHOICE_LETTERS},
                })

    distribution = {
        "global": {l: global_ctr[l] for l in CHOICE_LETTERS + ["multi"]},
        "by_exam": {
            code: {l: ctr[l] for l in CHOICE_LETTERS + ["multi"] if ctr[l]}
            for code, ctr in sorted(by_exam.items())
        },
        "by_category": {
            cat: {l: ctr[l] for l in CHOICE_LETTERS} for cat, ctr in by_category.items()
        },
        "multi_answer_items": multi_answers,
    }
    return flags, distribution


# ---------- 3. cross-year duplicate detection ------------------------------


_PUNCT_RE = re.compile(r"[\s，、。．\.\,\"'“”‘’（）()「」『』：；:;!?\-_<>\[\]]")


def normalize_text(s: str) -> str:
    s = unicodedata.normalize("NFKC", s)
    s = s.lower()
    s = _PUNCT_RE.sub("", s)
    return s


def hash_item(text: str) -> str:
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:16]


def check_duplicates(items: list[dict]) -> tuple[list[dict], dict]:
    flags: list[dict] = []
    full_groups: dict[str, list[dict]] = defaultdict(list)
    stem_groups: dict[str, list[dict]] = defaultdict(list)

    for it in items:
        q_norm = normalize_text(it.get("question", ""))
        ch = it.get("choices") or {}
        c_norm = "|".join(normalize_text(ch.get(l, "")) for l in CHOICE_LETTERS)
        if not q_norm:
            continue
        full_h = hash_item(q_norm + "||" + c_norm)
        stem_h = hash_item(q_norm)
        full_groups[full_h].append(it)
        stem_groups[stem_h].append(it)

    conflicts = 0
    drifts = 0
    for h, group in full_groups.items():
        if len(group) < 2:
            continue
        answers = {it["answer"] for it in group}
        if len(answers) > 1:
            flags.append({
                "type": "cross_year_conflict",
                "hash": h,
                "members": [
                    {"id": it["id"], "year": it["year"], "answer": it["answer"]}
                    for it in group
                ],
                "question_snippet": group[0]["question"][:120],
            })
            conflicts += 1

    seen_full = set()
    for h, group in stem_groups.items():
        if len(group) < 2:
            continue
        # Same stem but different normalized choices
        c_keys = {
            hash_item("|".join(
                normalize_text((it.get("choices") or {}).get(l, ""))
                for l in CHOICE_LETTERS
            )): it
            for it in group
        }
        if len(c_keys) < 2:
            continue
        flags.append({
            "type": "question_duplicate_choice_drift",
            "stem_hash": h,
            "members": [
                {
                    "id": it["id"],
                    "year": it["year"],
                    "answer": it["answer"],
                    "choices": {l: (it.get("choices") or {}).get(l, "") for l in CHOICE_LETTERS},
                }
                for it in group
            ],
            "question_snippet": group[0]["question"][:120],
        })
        drifts += 1

    summary = {
        "unique_question_hashes": len(full_groups),
        "duplicate_groups": sum(1 for g in full_groups.values() if len(g) > 1),
        "cross_year_conflicts": conflicts,
        "choice_drift_groups": drifts,
    }
    return flags, summary


# ---------- 4. structural invariants ---------------------------------------


VALID_ANSWER_LETTER_RE = re.compile(r"^[ア-エ](?:/[ア-エ])*$")


def check_structure(items: list[dict]) -> tuple[list[dict], dict]:
    flags: list[dict] = []
    summary = {
        "total_items": len(items),
        "issues": 0,
    }

    # id uniqueness
    ids = [it["id"] for it in items]
    dup_ids = [i for i, n in Counter(ids).items() if n > 1]
    for i in dup_ids:
        flags.append({"type": "structure", "issue": "duplicate_id", "id": i})

    # per-exam coverage
    by_exam: dict[str, list[dict]] = defaultdict(list)
    for it in items:
        by_exam[it["exam_code"]].append(it)
    summary["total_exams"] = len(by_exam)

    for code, exam_items in sorted(by_exam.items()):
        nums = sorted(it["number"] for it in exam_items)
        if nums != list(range(1, 101)):
            flags.append({
                "type": "structure",
                "issue": "question_number_coverage",
                "exam_code": code,
                "got_count": len(nums),
                "min": nums[0] if nums else None,
                "max": nums[-1] if nums else None,
                "missing": sorted(set(range(1, 101)) - set(nums)),
                "extra": sorted(set(nums) - set(range(1, 101))),
            })
        try:
            parse_exam_code(code)
        except Exception as e:
            flags.append({
                "type": "structure",
                "issue": "exam_code_unparseable",
                "exam_code": code,
                "error": str(e),
            })

    # per-item invariants
    missing_figs = 0
    for it in items:
        expected_id = f"{it['exam_code']}-{it['number']}"
        if it["id"] != expected_id:
            flags.append({
                "type": "structure",
                "issue": "id_mismatch",
                "id": it["id"],
                "expected": expected_id,
            })
        ans = it.get("answer")
        if not ans or not VALID_ANSWER_LETTER_RE.match(ans):
            flags.append({
                "type": "structure",
                "issue": "answer_invalid",
                "id": it["id"],
                "answer": ans,
            })
        cat = it.get("category")
        if cat is not None and cat not in VALID_CATEGORIES:
            flags.append({
                "type": "structure",
                "issue": "category_invalid",
                "id": it["id"],
                "category": cat,
            })
        fmt = it.get("choice_format")
        if fmt not in VALID_FORMATS:
            flags.append({
                "type": "structure",
                "issue": "choice_format_invalid",
                "id": it["id"],
                "choice_format": fmt,
            })
        ch = it.get("choices") or {}
        if ch:
            if set(ch.keys()) != set(CHOICE_LETTERS):
                flags.append({
                    "type": "structure",
                    "issue": "choice_keys_wrong",
                    "id": it["id"],
                    "keys": sorted(ch.keys()),
                })
        else:
            if fmt != "see_figure":
                flags.append({
                    "type": "structure",
                    "issue": "empty_choices_unexpected",
                    "id": it["id"],
                    "choice_format": fmt,
                })
        for fig in it.get("figures") or []:
            p = ROOT / fig["path"]
            if not p.exists():
                flags.append({
                    "type": "structure",
                    "issue": "figure_missing_on_disk",
                    "id": it["id"],
                    "path": fig["path"],
                })
                missing_figs += 1
        if it.get("needs_manual_review"):
            flags.append({
                "type": "structure",
                "issue": "needs_manual_review_set",
                "id": it["id"],
            })

    summary["missing_figures"] = missing_figs
    summary["issues"] = len(flags)
    return flags, summary


# ---------- driver ---------------------------------------------------------


def main() -> None:
    all_items = json.loads((JSON_DIR / "_all.json").read_text())
    print(f"Loaded {len(all_items)} items")

    ans_flags, ans_summary = check_answers(all_items)
    dist_flags, distribution = check_distribution(all_items)
    dup_flags, dup_summary = check_duplicates(all_items)
    struct_flags, struct_summary = check_structure(all_items)

    flags = ans_flags + dist_flags + dup_flags + struct_flags
    flag_counts = Counter(f["type"] for f in flags)

    report = {
        "summary": {
            "total_items": len(all_items),
            "total_exams": struct_summary.get("total_exams"),
            "total_flags": len(flags),
            "by_check": dict(flag_counts),
            "answer_cross_validation": ans_summary,
            "duplicate_detection": dup_summary,
            "structural": struct_summary,
        },
        "answer_distribution": distribution,
        "flags": flags,
    }

    out = JSON_DIR / "_qa_report.json"
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2))

    print()
    print("=" * 60)
    print(f"QA report -> {out}")
    print("-" * 60)
    print(f"total flags: {len(flags)}")
    for t, n in flag_counts.most_common():
        print(f"  {t}: {n}")
    print()
    print("global answer distribution:", distribution["global"])
    print()
    print("first 10 flags:")
    for f in flags[:10]:
        print(f"  {f.get('type')}: {json.dumps({k: v for k, v in f.items() if k != 'type'}, ensure_ascii=False)[:200]}")


if __name__ == "__main__":
    main()
