#!/usr/bin/env python3
"""Verify and join the adjacent archive parts into a standard ZIP file."""

import hashlib
import json
from pathlib import Path
import sys


def main():
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python restore.py OUTPUT.zip")
    directory = Path(__file__).resolve().parent
    manifest = json.loads((directory / "manifest.json").read_text())
    output = Path(sys.argv[1])
    combined = hashlib.sha256()
    total = 0
    # Refuse to overwrite an existing file, including an archive part.
    destination = output.open("xb")
    try:
        with destination:
            for part in manifest["parts"]:
                digest = hashlib.sha256()
                size = 0
                with (directory / part["file"]).open("rb") as source:
                    for block in iter(lambda: source.read(1024 * 1024), b""):
                        destination.write(block)
                        digest.update(block)
                        combined.update(block)
                        size += len(block)
                if size != part["bytes"] or digest.hexdigest() != part["sha256"]:
                    raise ValueError("Checksum or size mismatch: " + part["file"])
                total += size
                print("Verified " + part["file"])
            if (total != manifest["archive_bytes"]
                    or combined.hexdigest() != manifest["archive_sha256"]):
                raise ValueError("Combined archive checksum or size mismatch")
    except BaseException:
        output.unlink()
        raise
    print("Created and verified " + str(output))


if __name__ == "__main__":
    main()
