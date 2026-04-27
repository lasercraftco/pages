"""Library scanner — walks the configured roots, identifies ebooks +
audiobooks, extracts metadata, downloads cover art, upserts to Postgres.

Public entrypoints:
- run_full_scan() — scan all configured roots
- run_path_scan(path) — re-scan a specific subtree (called when files change)

Both write progress events to Postgres so the web UI can show live status.
"""

from .runner import run_full_scan, run_path_scan

__all__ = ["run_full_scan", "run_path_scan"]
