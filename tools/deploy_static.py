from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path
from urllib import request


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Deploy static artifact to target environment")
    parser.add_argument("--environment", required=True, choices=["dev", "prod"])
    parser.add_argument("--region", default="")
    parser.add_argument("--artifact-path", required=True)
    parser.add_argument("--manifest-path", default="deploy/pages-manifest.json")
    parser.add_argument("--base-url", default="")
    parser.add_argument("--webhook-url", default="")
    return parser.parse_args()


def load_manifest(manifest_path: Path) -> dict:
    if not manifest_path.exists():
        raise FileNotFoundError(f"Manifest file does not exist: {manifest_path}")
    with manifest_path.open("r", encoding="utf-8") as handle:
        manifest = json.load(handle)
    if not isinstance(manifest, dict):
        raise ValueError("Manifest must be a JSON object.")
    return manifest


def build_release_bundle(artifact_path: Path, environment: str, manifest: dict) -> Path:
    common_patterns = manifest.get("common", [])
    env_patterns = manifest.get(environment)

    if not isinstance(common_patterns, list):
        raise ValueError("Manifest key 'common' must be an array.")
    if not isinstance(env_patterns, list):
        raise ValueError(f"Manifest key '{environment}' must be an array.")

    include_patterns = [*common_patterns, *env_patterns]
    files_to_copy: set[Path] = set()

    for pattern in include_patterns:
        if not isinstance(pattern, str) or not pattern.strip():
            continue
        for match in artifact_path.glob(pattern):
            if match.is_file():
                files_to_copy.add(match.resolve())

    if not files_to_copy:
        raise ValueError(
            f"No files matched manifest patterns for environment '{environment}'."
        )

    bundle_path = artifact_path.parent / f"{artifact_path.name}-{environment}-release"
    if bundle_path.exists():
        shutil.rmtree(bundle_path)
    bundle_path.mkdir(parents=True, exist_ok=True)

    for source in sorted(files_to_copy):
        relative_path = source.relative_to(artifact_path.resolve())
        destination = bundle_path / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)

    return bundle_path


def main() -> int:
    args = parse_args()
    artifact_path = Path(args.artifact_path)
    manifest_path = Path(args.manifest_path)

    if not artifact_path.exists():
        print(f"Artifact path does not exist: {artifact_path}")
        return 1

    try:
        manifest = load_manifest(manifest_path)
        deploy_path = build_release_bundle(artifact_path, args.environment, manifest)
    except (FileNotFoundError, ValueError, json.JSONDecodeError) as exc:
        print(f"Failed to prepare release bundle: {exc}")
        return 1

    print(f"Preparing deployment for environment={args.environment}, region={args.region or 'n/a'}")
    print(f"Source artifact path: {artifact_path}")
    print(f"Release bundle path: {deploy_path}")

    payload = {
        "environment": args.environment,
        "region": args.region,
        "baseUrl": args.base_url,
        "artifactPath": str(deploy_path),
    }

    if not args.webhook_url:
        print("No DEPLOY_WEBHOOK_URL configured. Running in dry-run mode.")
        print(json.dumps(payload, indent=2))
        return 0

    req = request.Request(
        url=args.webhook_url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with request.urlopen(req, timeout=30) as response:  # nosec B310
        status = getattr(response, "status", None)
        body = response.read().decode("utf-8", errors="replace")
        if status and status >= 400:
            print(f"Deployment webhook failed with status {status}")
            print(body)
            return 1
        print(f"Deployment webhook accepted with status {status}")
        if body:
            print(body)

    return 0


if __name__ == "__main__":
    sys.exit(main())
