from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML_FILES = sorted(ROOT.glob("*.html"))

IGNORE_PREFIXES = (
    "http://",
    "https://",
    "mailto:",
    "tel:",
    "javascript:",
    "#",
    "data:",
)

REF_PATTERN = re.compile(r"(?:href|src)\s*=\s*[\"']([^\"']+)[\"']", re.IGNORECASE)


def is_local_reference(ref: str) -> bool:
    return bool(ref) and not ref.startswith(IGNORE_PREFIXES)


def normalize_reference(ref: str) -> str:
    return ref.split("#", 1)[0].split("?", 1)[0].strip()


def main() -> int:
    errors: list[str] = []

    if not HTML_FILES:
        print("No root HTML files were found.")
        return 1

    for html_file in HTML_FILES:
        content = html_file.read_text(encoding="utf-8")
        doctype_count = len(re.findall(r"<!DOCTYPE\s+html>", content, flags=re.IGNORECASE))
        if doctype_count != 1:
            errors.append(
                f"{html_file.name}: expected exactly one <!DOCTYPE html>, found {doctype_count}."
            )

        refs = REF_PATTERN.findall(content)
        for ref in refs:
            if not is_local_reference(ref):
                continue
            normalized = normalize_reference(ref)
            if not normalized:
                continue
            candidate = (ROOT / normalized).resolve()
            if not candidate.exists():
                errors.append(f"{html_file.name}: missing local reference '{normalized}'.")

    if errors:
        print("Validation failed:\n")
        for err in errors:
            print(f"- {err}")
        return 1

    print(f"Validation passed for {len(HTML_FILES)} HTML files.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
