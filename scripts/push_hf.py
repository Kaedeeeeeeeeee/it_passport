"""Push dataset/ to HuggingFace as a private dataset.

Requires HF_TOKEN in .env (write-scoped token from
https://huggingface.co/settings/tokens).

Repo: ZhangShifeng/it-passport (private, cc-by-nc-sa-4.0)
"""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from huggingface_hub import HfApi, create_repo

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

REPO_ID = "ZhangShifeng/it-passport"
DATASET_DIR = ROOT / "dataset"


def main() -> None:
    token = os.environ.get("HF_TOKEN")
    if not token:
        raise SystemExit("HF_TOKEN not set. Put it in .env (write-scoped).")

    api = HfApi(token=token)

    create_repo(
        repo_id=REPO_ID,
        repo_type="dataset",
        private=True,
        exist_ok=True,
        token=token,
    )
    print(f"repo ready: {REPO_ID} (private)")

    commit = api.upload_folder(
        folder_path=str(DATASET_DIR),
        repo_id=REPO_ID,
        repo_type="dataset",
        commit_message="Initial upload: 2800 IT Passport questions + 228 figures",
    )
    print(f"pushed: {commit.commit_url if hasattr(commit, 'commit_url') else commit}")
    print(f"view at: https://huggingface.co/datasets/{REPO_ID}")


if __name__ == "__main__":
    main()
