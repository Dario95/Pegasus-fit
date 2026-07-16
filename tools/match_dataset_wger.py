#!/usr/bin/env python3
"""Cruce de nombres entre el dataset de ejercicios y el catálogo wger.

Uso:
  1. Exportar nombres EN de wger (en el NAS):
     sudo docker exec wger-db-1 psql -U wger -d wger -tAc \
       "SELECT t.name FROM exercises_translation t WHERE t.language_id = 2" > wger_names_en.txt
  2. python3 match_dataset_wger.py exercises_dataset.json wger_names_en.txt

Resultado 2026-07-15: 157 matches exactos / 1324 (9%) → se decidió importar
el dataset como catálogo canónico en vez de depurar wger (ver docs/especificacion_v3.md §3.4).
"""
import json
import re
import sys
import difflib


def norm(s: str) -> str:
    s = s.lower().strip()
    s = re.sub(r"[-_/]", " ", s)
    s = re.sub(r"[^a-z0-9 ]", "", s)
    return re.sub(r"\s+", " ", s)


def main(dataset_path: str, wger_names_path: str) -> None:
    ds = json.load(open(dataset_path))
    ds_names = {norm(e["name"]): e["id"] for e in ds}
    wger = [l.strip() for l in open(wger_names_path) if l.strip()]
    wger_norm = {norm(w): w for w in wger}

    exact = set(ds_names) & set(wger_norm)
    print(f"wger EN: {len(wger)} | dataset: {len(ds)}")
    print(f"match exacto (normalizado): {len(exact)}")

    ds_rest = [n for n in ds_names if n not in exact]
    wger_rest = [n for n in wger_norm if n not in exact]
    fuzzy = []
    for n in ds_rest:
        m = difflib.get_close_matches(n, wger_rest, n=1, cutoff=0.9)
        if m:
            fuzzy.append((n, m[0]))
    print(f"fuzzy adicional (ratio>=0.9, revisar a mano — hay falsos positivos): {len(fuzzy)}")
    for a, b in fuzzy[:20]:
        print(f"  {a!r} ~ {b!r}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
