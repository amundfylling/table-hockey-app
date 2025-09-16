"""Utility script to refresh matches.json from the upstream parquet dataset.

Usage
-----
python convert_parquet_to_json.py \
    --parquet-url https://raw.githubusercontent.com/amundfylling/Scorpion-Scraper-2.0/main/data/scraped_matches.parquet \
    --output matches.json

By default the script uses the upstream parquet URL shown above and writes to
`matches.json` in the current working directory.
"""

from __future__ import annotations

import argparse
import io
import json
from pathlib import Path

import pandas as pd
import requests

DEFAULT_PARQUET_URL = (
    "https://raw.githubusercontent.com/amundfylling/Scorpion-Scraper-2.0/main/data/"
    "scraped_matches.parquet"
)
DEFAULT_OUTPUT = "matches.json"


def download_parquet(parquet_url: str) -> io.BytesIO:
    """Download a parquet file and return its binary content as a BytesIO buffer."""
    response = requests.get(parquet_url, timeout=60)
    response.raise_for_status()
    return io.BytesIO(response.content)


def convert(parquet_url: str, output_path: Path) -> None:
    """Convert the remote parquet data to newline-free JSON records."""
    parquet_bytes = download_parquet(parquet_url)
    df = pd.read_parquet(parquet_bytes)

    # Replace pandas-specific NaN values with plain ``None`` so JSON stays clean.
    df = df.where(pd.notnull(df), None)

    records = df.to_dict(orient="records")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as json_file:
        json.dump(records, json_file, ensure_ascii=False, indent=2)

    print(
        f"Wrote {len(records)} records to {output_path} "
        f"(source: {parquet_url})"
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Download the upstream parquet dataset and export it as matches.json "
            "for the static site."
        )
    )
    parser.add_argument(
        "--parquet-url",
        default=DEFAULT_PARQUET_URL,
        help="URL of the parquet file to download (default: %(default)s)",
    )
    parser.add_argument(
        "--output",
        default=DEFAULT_OUTPUT,
        help="Path to the JSON file that will be written (default: %(default)s)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    convert(args.parquet_url, Path(args.output))


if __name__ == "__main__":
    main()
