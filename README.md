# Table Hockey Match Explorer

This project is a static website (index.html, style.css, script.js) that lets you
explore historical table hockey match data.

## Refreshing `matches.json`

The site expects a `matches.json` file that mirrors the schema of the original
Parquet dataset hosted at:

```
https://raw.githubusercontent.com/amundfylling/Scorpion-Scraper-2.0/main/data/scraped_matches.parquet
```

Run the helper script to download the parquet file and convert it to JSON:

```bash
python convert_parquet_to_json.py
```

By default the script writes `matches.json` to the current directory. Use
`--output` to change the destination or `--parquet-url` to target a different
source file. This makes it easy to schedule a daily refresh with a cron job or a
GitHub Actions workflow.
