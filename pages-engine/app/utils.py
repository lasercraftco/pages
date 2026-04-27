from __future__ import annotations

import re


def sortable_title(title: str) -> str:
    return re.sub(r"^(the |a |an )", "", title.strip(), flags=re.IGNORECASE).lower()


def sortable_author(name: str) -> str:
    parts = name.strip().split()
    if len(parts) < 2:
        return name.lower()
    last = parts[-1]
    rest = " ".join(parts[:-1])
    return f"{last}, {rest}".lower()
