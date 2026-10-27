"""Pemeriksa semantik SQL: nama tabel, kolom, dan fungsi yang dirujuk.

Membaca seluruh berkas migrasi, mengumpulkan tabel/kolom/fungsi yang
didefinisikan, lalu memeriksa setiap rujukan di dalam tubuh PL/pgSQL dan
DDL. Menangkap salah ketik seperti `from surat_masuks` atau `app_caller_idd()`.

Jalankan: python scripts/check-sql-semantics.py
"""
import io
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MIGRATIONS = sorted((ROOT / "supabase" / "migrations").glob("*.sql"))

# Kata kunci & fungsi bawaan Postgres yang boleh muncul sebagai pemanggil.
BUILTIN = set("""
count sum avg min max now current_date current_timestamp current_user
session_user coalesce nullif greatest least array_agg jsonb_build_object
json_build_object to_jsonb jsonb_set gen_random_uuid md5 extract
date_trunc age to_char substring upper lower trim concat
position strpos length replace split_part regexp_replace unnest
row_number rank dense_rank lag lead ntile percent_rank cume_dist
abs round ceil floor power mod sign sqrt exp ln log
bool_or bool_and every json_agg jsonb_agg array_to_json
pg_typeof format quote_ident quote_literal to_timestamp to_date
regexp_match regexp_split_to_table
substr random clock_timestamp uid pg_advisory_xact_lock hashtext
array_length string_to_array right left btrim rtrim ltrim
jsonb_array_elements jsonb_array_elements_text array_append
array_to_string string_agg jsonb_build_array jsonb_set
btrim regexp_replace age to_char current_timestamp
""".split())

KEYWORDS = set("""
select from where group by having order limit offset insert into values
update set delete create or replace function trigger view index
begin end declare return if else elseif elsif loop for while case when
then else exception raise using language sql plpgsql immutable volatile
stable strict security definer invoker set search_path as
and or not in exists between like ilike all any some distinct
on conflict do nothing update
with recursive union intersect except
add column drop add constraint primary key foreign references
unique check default alter
true false null
""".split())


def read_all():
    return {p: p.read_text(encoding="utf-8") for p in MIGRATIONS}


def collect_tables(schemas):
    """Kembalikan {tabel: {kolom}} dari pernyataan CREATE TABLE."""
    tables = {}
    pattern = re.compile(
        r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?(\w+)\s*\((.*?)\n\);",
        re.IGNORECASE | re.DOTALL,
    )
    for text in schemas.values():
        for m in pattern.finditer(text):
            name = m.group(1).lower()
            cols = set()
            for line in m.group(2).split("\n"):
                line = line.strip()
                if not line or line.startswith("--"):
                    continue
                first = line.split()[0].lower()
                if first in ("constraint", "primary", "foreign", "unique", "check", "exclude"):
                    continue
                cols.add(first)
            tables[name] = cols
    return tables


def collect_functions(schemas):
    names = set()
    for text in schemas.values():
        for m in re.finditer(
            r"CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?(\w+)\s*\(",
            text,
            re.IGNORECASE,
        ):
            names.add(m.group(1).lower())
    return names


def collect_ctes(body):
    """Kembalikan nama CTE yang dideklarasikan di dalam satu tubuh fungsi."""
    return {m.group(1).lower() for m in re.finditer(r"(?:\bwith|,)\s+(\w+)\s+as\s*\(", body, re.IGNORECASE)}


def strip_comments(text):
    text = re.sub(r"--[^\n]*", "", text)
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    return text


def strip_strings(text):
    """Hapus literal string agar teks di dalamnya tidak dianggap pemanggilan fungsi."""
    out = []
    i = 0
    n = len(text)
    while i < n:
        ch = text[i]
        if ch == "'":
            i += 1
            while i < n:
                if text[i] == "'":
                    if i + 1 < n and text[i + 1] == "'":
                        i += 2
                        continue
                    i += 1
                    break
                i += 1
            out.append("''")
            continue
        if ch == '"':
            i += 1
            while i < n and text[i] != '"':
                i += 1
            i += 1
            out.append('""')
            continue
        out.append(ch)
        i += 1
    return "".join(out)


ALIAS_RE = re.compile(
    r"\b(?:from|join|update|into)\s+(?:public\.)?(\w+)\s+(?:as\s+)?(\w+)",
    re.IGNORECASE,
)


FUNC_BODY_RE = re.compile(
    r"CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?(\w+)\s*\(.*?\)\s*"
    r"RETURNS\s+.*?AS\s+\$\$(.*?)\$\$",
    re.IGNORECASE | re.DOTALL,
)


def check_body(name, body, tables, functions, problems):
    body_clean = strip_strings(strip_comments(body))
    # EXTRACT(field FROM x) bukan rujukan tabel; INTO v_x mendefinisikan variabel.
    body_clean = re.sub(r"extract\s*\([^)]*?from\s+\w+", "extract(x)", body_clean, flags=re.IGNORECASE)
    body_clean = re.sub(r"distinct\s+from", "distinct", body_clean, flags=re.IGNORECASE)
    body_clean = re.sub(r"(?<!\w)into\s+v_\w+", "into", body_clean, flags=re.IGNORECASE)
    # FROM nama_fungsi( ... ) adalah pemanggilan fungsi, bukan tabel.
    body_clean = re.sub(r"(?<!\w)from\s+(\w+)\s*\(", r"from (", body_clean, flags=re.IGNORECASE)
    body_clean = re.sub(r"(?<!\w)join\s+(\w+)\s*\(", r"join (", body_clean, flags=re.IGNORECASE)
    ctes = collect_ctes(body_clean)

    # Alias tabel (from surat_masuk s) ikut disaring agar tidak dianggap tabel.
    aliases = set()
    for m in ALIAS_RE.finditer(body_clean):
        alias = m.group(2).lower()
        if alias in KEYWORDS or alias in ctes:
            continue
        aliases.add(alias)

    # 1. Rujukan tabel
    table_refs = set()
    for m in re.finditer(
        r"\b(?:from|join|insert\s+into|update|delete\s+from|alter\s+table|truncate\s+table|references)\s+(?:public\.)?(\w+)",
        body_clean,
        re.IGNORECASE,
    ):
        table_refs.add(m.group(1).lower())
    for t in table_refs:
        if t in ctes or t in KEYWORDS or t in aliases:
            continue
        if t not in tables:
            problems.append(f"{name}: tabel tidak dikenal -> {t}")

    # 2. INSERT INTO t (kolom)
    for m in re.finditer(
        r"insert\s+into\s+(?:public\.)?(\w+)\s*\(([^)]*)\)", body_clean, re.IGNORECASE | re.DOTALL
    ):
        tbl = m.group(1).lower()
        if tbl in ctes or tbl in aliases or tbl not in tables:
            continue
        for col in m.group(2).split(","):
            col = col.strip().lower().split()[0] if col.strip() else ""
            if not col or col in ("select", "default"):
                continue
            if col not in tables[tbl]:
                problems.append(f"{name}: kolom tidak dikenal -> {tbl}.{col}")

    # 3. UPDATE t SET col
    for m in re.finditer(
        r"update\s+(?:public\.)?(\w+)\s+set\s+(\w+)\s*=", body_clean, re.IGNORECASE
    ):
        tbl, col = m.group(1).lower(), m.group(2).lower()
        if tbl in ctes or tbl in aliases or tbl not in tables:
            continue
        if col not in tables[tbl]:
            problems.append(f"{name}: kolom tidak dikenal -> {tbl}.{col}")

    # 4. Rujukan terqualified t.col
    for m in re.finditer(r"\b(\w+)\.(\w+)\b", body_clean):
        tbl, col = m.group(1).lower(), m.group(2).lower()
        if tbl in ctes or tbl in aliases or tbl not in tables:
            continue
        if col in ("id",) or col in tables[tbl]:
            continue
        # abaikan yang jelas bukan kolom (mis. nama alias variabel)
        if tbl in tables and col in ("count", "sum", "now"):
            continue
        problems.append(f"{name}: kolom tidak dikenal -> {tbl}.{col}")

    # 5. Panggilan fungsi
    for m in re.finditer(r"\b([a-z_][a-z0-9_]{2,})\s*\(", body_clean, re.IGNORECASE):
        fn = m.group(1).lower()
        if fn in BUILTIN or fn in KEYWORDS or fn in functions or fn in ctes or fn in aliases:
            continue
        if fn in tables:
            continue
        problems.append(f"{name}: fungsi tidak dikenal -> {fn}()")


def main():
    schemas = read_all()
    tables = collect_tables(schemas)
    functions = collect_functions(schemas)
    problems = []

    for path, text in schemas.items():
        clean = strip_comments(text)
        for m in FUNC_BODY_RE.finditer(clean):
            name = m.group(1)
            check_body(f"{path.name}:{name}", m.group(2), tables, functions, problems)

        # REFERENCES di level DDL
        for m in re.finditer(
            r"references\s+(?:public\.)?(\w+)\s*\(\s*(\w+)\s*\)", clean, re.IGNORECASE
        ):
            tbl, col = m.group(1).lower(), m.group(2).lower()
            if tbl not in tables:
                problems.append(f"{path.name}: REFERENCES tabel tidak dikenal -> {tbl}")
            elif col not in tables[tbl]:
                problems.append(f"{path.name}: REFERENCES kolom tidak dikenal -> {tbl}.{col}")

    seen = set()
    unique = []
    for p in problems:
        if p not in seen:
            seen.add(p)
            unique.append(p)

    for p in unique:
        print(p)
    print()
    print(f"Tabel terdeteksi: {len(tables)} · Fungsi terdeteksi: {len(functions)}")
    print(f"TOTAL: {len(unique)} masalah.")
    return 1 if unique else 0


if __name__ == "__main__":
    sys.exit(main())
