"""Pemeriksa sintaks SQL Postgres untuk berkas migrasi Supabase.

Menggunakan pglast (libpg_query) untuk mem-parse tiap pernyataan SQL dan
tubuh fungsi PL/pgSQL. Tujuannya menangkap galat sintaks sebelum berkas
dijalankan di SQL Editor Supabase.

Jalankan: python scripts/check-sql.py
"""
import io
import re
import sys
from pathlib import Path

from pglast import parse_sql
from pglast.parser import ParseError

ROOT = Path(__file__).resolve().parent.parent
MIGRATIONS = sorted((ROOT / "supabase" / "migrations").glob("*.sql"))

FUNC_RE = re.compile(
    r"CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+[\w.]+\s*\((?P<args>.*?)\)\s*"
    r"RETURNS\s+(?P<ret>[\w\s\[\]\.\%]+?)\s*(?:LANGUAGE\s+\w+)?\s*AS\s+\$\$(?P<body>.*?)\$\$",
    re.IGNORECASE | re.DOTALL,
)


def strip_comments(sql: str) -> str:
    """Hapus komentar `--` dan `/* */` tanpa menyentuh teks di dalam literal.

    Tanpa ini, tanda `;` yang berada di dalam komentar membuat skrip terpotong
    di tengah comment sehingga pemeriksaan melaporkan galat palsu.
    """
    out = []
    i = 0
    n = len(sql)
    while i < n:
        ch = sql[i]
        if ch == "'":
            out.append(ch)
            i += 1
            while i < n:
                out.append(sql[i])
                if sql[i] == "'":
                    if i + 1 < n and sql[i + 1] == "'":
                        out.append(sql[i + 1])
                        i += 2
                        continue
                    i += 1
                    break
                i += 1
            continue
        if ch == '"':
            out.append(ch)
            i += 1
            while i < n:
                out.append(sql[i])
                if sql[i] == '"':
                    i += 1
                    break
                i += 1
            continue
        if sql.startswith("--", i):
            j = sql.find("\n", i)
            i = n if j == -1 else j
            continue
        if sql.startswith("/*", i):
            j = sql.find("*/", i + 2)
            i = n if j == -1 else j + 2
            out.append(" ")
            continue
        out.append(ch)
        i += 1
    return "".join(out)


def split_statements(sql: str):
    """Pisah skrip menjadi pernyataan individual dengan cuplikan sumber."""
    sql = strip_comments(sql)
    statements = []
    buf = []
    in_dollar = False
    tag = ""
    for ch in sql:
        if in_dollar:
            buf.append(ch)
            if ch == "$":
                # tag penutup: $tag$
                tail = "".join(buf[-len(tag) - 1:]) if tag else "$"
                if tail.endswith(f"${tag}$"):
                    statements.append("".join(buf))
                    buf = []
                    in_dollar = False
                    tag = ""
            continue
        if ch == "$":
            in_dollar = True
            buf.append(ch)
            m = re.search(r"\$([A-Za-z_][A-Za-z0-9_]*)?$", "".join(buf))
            tag = (m.group(1) or "") if m else ""
            continue
        if ch == ";":
            buf.append(ch)
            statements.append("".join(buf))
            buf = []
            continue
        buf.append(ch)
    if "".join(buf).strip():
        statements.append("".join(buf))
    return statements


def line_of(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1


def check_file(path: Path) -> int:
    sql = path.read_text(encoding="utf-8")
    errors = 0

    # 1. Parse skrip sebagai satu kesatuan
    try:
        parse_sql(sql)
    except ParseError as exc:
        loc = getattr(exc, "location", None)
        msg = str(exc)
        if loc:
            errors += 1
            print(f"  [GALAT] {path.name}: {msg} (posisi {loc})")
        else:
            # pglast kadang gagal pada seluruh skrip hanya karena satu bagian;
            # laporkan sebagai peringatan dan lanjutkan per pernyataan.
            print(f"  [PERINGATAN] {path.name}: {msg[:160]}")
            errors += 0

    # 2. Parse tiap pernyataan secara terpisah agar lokasi galat presisi
    for stmt in split_statements(sql):
        if not stmt.strip():
            continue
        try:
            parse_sql(stmt)
        except ParseError as exc:
            errors += 1
            print(f"  [GALAT] {path.name}: {str(exc)[:200]}")

    # 3. Parse tubuh fungsi PL/pgSQL
    for match in FUNC_RE.finditer(sql):
        body = match.group("body")
        if not body.strip():
            continue
        name = re.search(r"FUNCTION\s+([\w.]+)", match.group(0), re.IGNORECASE)
        fname = name.group(1) if name else "?"
        for stmt in split_statements(body):
            if not stmt.strip():
                continue
            try:
                parse_sql(stmt)
            except ParseError as exc:
                errors += 1
                print(f"  [GALAT] tubuh {fname}: {str(exc)[:200]}")

    return errors


def main() -> int:
    if not MIGRATIONS:
        print("Tidak ada berkas migrasi ditemukan.")
        return 1
    total = 0
    for path in MIGRATIONS:
        count = check_file(path)
        total += count
        status = "OK" if count == 0 else f"{count} galat"
        print(f"{path.name}: {status}")
    print()
    if total:
        print(f"TOTAL: {total} galat sintaks.")
        return 1
    print("TOTAL: tidak ada galat sintaks.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
