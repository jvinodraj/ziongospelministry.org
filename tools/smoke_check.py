from __future__ import annotations

import argparse
import sys
from urllib import request


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Basic HTTP smoke checks")
    parser.add_argument("--base-url", default="")
    parser.add_argument("--label", default="environment")
    return parser.parse_args()


def fetch(url: str) -> tuple[int, str]:
    req = request.Request(url, headers={"User-Agent": "zgm-smoke-check/1.0"}, method="GET")
    with request.urlopen(req, timeout=30) as response:  # nosec B310
        status = getattr(response, "status", 0)
        body = response.read().decode("utf-8", errors="replace")
    return status, body


def main() -> int:
    args = parse_args()
    base_url = args.base_url.strip().rstrip("/")

    if not base_url:
        print(f"[{args.label}] BASE_URL is not configured. Skipping smoke checks.")
        return 0

    checks = [
        f"{base_url}/",
        f"{base_url}/index.html",
        f"{base_url}/contact.html",
    ]

    for url in checks:
        print(f"[{args.label}] Checking {url}")
        try:
            status, body = fetch(url)
        except Exception as exc:
            print(f"[{args.label}] Request failed for {url}: {exc}")
            return 1

        if status >= 400:
            print(f"[{args.label}] Unexpected HTTP status {status} for {url}")
            return 1

        if "Zion Gospel Ministry" not in body:
            print(f"[{args.label}] Content check failed for {url}")
            return 1

    print(f"[{args.label}] Smoke checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
