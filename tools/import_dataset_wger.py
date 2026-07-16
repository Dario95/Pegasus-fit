#!/usr/bin/env python3
"""
Importa el catálogo canónico de Pegasus Fit desde hasaneyldrm/exercises-dataset hacia wger.

Adaptación del import_exercises.py original (que apuntaba a yuhonas/free-exercise-db).
Diferencias clave:
  - Dataset nuevo: 1,324 ejercicios con imagen JPG + GIF garantizados (© GymVisual).
  - Crea traducción EN y ES (el dataset trae instrucciones en ambos idiomas).
  - Sube JPG como imagen principal y GIF como imagen secundaria.
  - Resuelve los IDs de idioma dinámicamente contra la API (no hardcodea).
  - Guarda el id del dataset en el estado para trazabilidad (ds_id → wger_id).

Uso (desde el NAS, en ~/wger):
    export WGER_TOKEN=<token de admin>          # Settings → API en la UI de wger
    python3 import_dataset_wger.py --dry-run    # plan sin tocar wger
    python3 import_dataset_wger.py --limit 5    # prueba con 5
    python3 import_dataset_wger.py              # importa todo
    python3 import_dataset_wger.py --resume     # retoma
    python3 import_dataset_wger.py --clean-test # borra lo importado por este script
"""

import argparse
import json
import logging
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import requests

# ── Configuración ─────────────────────────────────────────────────────────────

WGER_BASE  = os.environ.get("WGER_BASE", "http://localhost:8095/api/v2")
WGER_TOKEN = os.environ.get("WGER_TOKEN", "")

REPO_RAW      = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main"
EXERCISES_URL = f"{REPO_RAW}/data/exercises.json"

CACHE_DIR  = Path(__file__).parent / ".import_cache_dataset"
STATE_FILE = CACHE_DIR / "state.json"
EXERCISES_CACHE = CACHE_DIR / "exercises.json"

LICENSE_AUTHOR = "© GymVisual — via hasaneyldrm/exercises-dataset"

# ── Mapeos dataset → wger (fixtures estándar de wger) ─────────────────────────
# Ver docs/especificacion_v3.md §3.4. Aproximaciones marcadas con comentario.

CATEGORY_MAP = {  # body_part → exercisecategory
    "back":        12,
    "cardio":      15,
    "chest":       11,
    "lower arms":   8,   # Arms
    "lower legs":  14,   # Calves
    "neck":        13,   # aprox: Shoulders
    "shoulders":   13,
    "upper arms":   8,
    "upper legs":   9,   # Legs
    "waist":       10,   # Abs
}

MUSCLE_MAP = {  # target / secondary_muscles → exercises_muscle
    "abs":                    6,   # Rectus abdominis
    "core":                   6,
    "obliques":              14,   # Obliquus externus
    "biceps":                 1,
    "triceps":                5,
    "forearms":              13,   # aprox: Brachialis
    "pectorals":              4,   # Pectoralis major
    "chest":                  4,
    "delts":                  2,   # Anterior deltoid
    "shoulders":              2,
    "lats":                  12,
    "upper back":             9,   # aprox: Trapezius
    "traps":                  9,
    "levator scapulae":       9,   # aprox
    "spine":                 16,   # Erector spinae
    "lower back":            16,
    "glutes":                 8,
    "hamstrings":            11,   # Biceps femoris
    "quads":                 10,
    "adductors":             10,   # aprox
    "abductors":              8,   # aprox
    "calves":                 7,   # Gastrocnemius
    "soleus":                15,
    "serratus anterior":      3,
    # sin equivalente anatómico en wger → se omiten:
    # "cardiovascular system", "hip flexors", "wrists", "ankles", "feet", ...
}

EQUIPMENT_MAP = {  # equipment → exercises_equipment
    "barbell":          1,
    "olympic barbell":  1,
    "trap bar":         1,
    "smith machine":    1,   # aprox: patrón de barra
    "ez barbell":       2,   # SZ-Bar
    "dumbbell":         3,
    "stability ball":   5,   # Swiss Ball
    "bosu ball":        5,   # aprox
    "body weight":      7,   # none (bodyweight)
    "assisted":         7,
    "kettlebell":      10,
    "band":            11,
    "resistance band": 11,
    # cable / máquinas / medicine ball / rope / sled … → sin equipo wger específico
}

# ── Logging ───────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger(__name__)

# ── API helpers ───────────────────────────────────────────────────────────────

SESSION = requests.Session()


def wger_get(path, params=None):
    r = SESSION.get(f"{WGER_BASE}/{path.lstrip('/')}", params=params, timeout=15)
    r.raise_for_status()
    return r.json()


def wger_post(path, json_data=None, files=None, data=None):
    url = f"{WGER_BASE}/{path.lstrip('/')}"
    if json_data is not None:
        return SESSION.post(url, json=json_data, timeout=30)
    return SESSION.post(url, files=files, data=data, timeout=60)


def wger_delete(path):
    return SESSION.delete(f"{WGER_BASE}/{path.lstrip('/')}", timeout=15)


def resolve_language_ids():
    """Resuelve los IDs de idioma EN/ES contra la API (varían según instalación)."""
    langs = {}
    data = wger_get("language/", {"format": "json", "limit": 100})
    for item in data.get("results", []):
        langs[item["short_name"]] = item["id"]
    if "en" not in langs or "es" not in langs:
        raise RuntimeError(f"No se encontraron idiomas en/es en wger: {langs}")
    return langs["en"], langs["es"]


# ── Estado ────────────────────────────────────────────────────────────────────

def load_state():
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {"imported": {}, "failed": [], "skipped_duplicate": []}


def save_state(state):
    STATE_FILE.write_text(json.dumps(state, indent=2, ensure_ascii=False))


# ── Datos ─────────────────────────────────────────────────────────────────────

def fetch_exercises_json():
    if EXERCISES_CACHE.exists():
        log.info("Usando caché local de exercises.json")
        return json.loads(EXERCISES_CACHE.read_text())
    log.info("Descargando exercises.json del dataset…")
    r = requests.get(EXERCISES_URL, timeout=60)
    r.raise_for_status()
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    EXERCISES_CACHE.write_bytes(r.content)
    return r.json()


def download_media(rel_path):
    """Descarga images/XXXX.jpg o videos/XXXX.gif del repo del dataset.

    wger no acepta GIF como imagen: los GIFs se convierten a WebP animado
    con ffmpeg (mismo loop, menor peso). Si ffmpeg no está, se omite el GIF.
    """
    if not rel_path:
        return None, None
    r = requests.get(f"{REPO_RAW}/{rel_path}", timeout=60)
    if r.status_code == 404:
        return None, None
    r.raise_for_status()
    ext = Path(rel_path).suffix or ".jpg"
    tmp = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
    tmp.write(r.content)
    tmp.close()
    if ext != ".gif":
        return tmp.name, "image/jpeg"
    # wger no acepta imágenes animadas → GIF se convierte a MP4 y se sube
    # como video del ejercicio (la ficha lo reproduce en loop mudo).
    mp4 = tmp.name.replace(".gif", ".mp4")
    # Reescalado 2x con Lanczos ANTES de comprimir + CRF 16: evita el lavado de
    # bordes del 4:2:0 y la sobrecompresión del CRF por defecto (~29 kbps)
    rc = subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", tmp.name,
         "-movflags", "faststart", "-pix_fmt", "yuv420p",
         "-vf", "scale=360:360:flags=lanczos",
         "-c:v", "libx264", "-crf", "16", "-preset", "slow", mp4],
        capture_output=True,
    ).returncode
    Path(tmp.name).unlink(missing_ok=True)
    if rc != 0 or not Path(mp4).exists():
        log.warning(f"  ffmpeg no pudo convertir {rel_path} — GIF omitido")
        return None, None
    return mp4, "video/mp4"


# ── Mapeo ─────────────────────────────────────────────────────────────────────

def map_muscles(names):
    ids = []
    for m in names or []:
        wid = MUSCLE_MAP.get(str(m).strip().lower())
        if wid and wid not in ids:
            ids.append(wid)
    return ids


def build_description(ex, lang):
    """Construye descripción HTML + texto plano por idioma ('en'/'es')."""
    steps = (ex.get("instruction_steps") or {}).get(lang) or []
    if not steps:
        flat = (ex.get("instructions") or {}).get(lang, "")
        steps = [flat] if flat else []
    if not steps:
        return None, None
    text = " ".join(s.strip() for s in steps)
    while len(text) < 40:  # mínimo exigido por wger
        text += f" ({ex['name']})"
    html = "<ol>" + "".join(f"<li>{s.strip()}</li>" for s in steps) + "</ol>"
    return html, text


def upload_image(ex_id, media_path, mime, is_main):
    with open(media_path, "rb") as f:
        return wger_post(
            "exerciseimage/",
            data={"exercise": ex_id, "is_main": str(is_main), "license": "1",
                  "license_author": LICENSE_AUTHOR},
            files={"image": (Path(media_path).name, f, mime)},
        )


# ── Importación ───────────────────────────────────────────────────────────────

def import_exercise(ex, lang_en, lang_es, dry_run=False):
    name        = ex["name"].strip()
    category_id = CATEGORY_MAP.get((ex.get("body_part") or "").lower(), 8)
    equipment   = EQUIPMENT_MAP.get((ex.get("equipment") or "").lower())
    muscles     = map_muscles([ex.get("target")] + ([ex.get("muscle_group")] or []))
    muscles_sec = [m for m in map_muscles(ex.get("secondary_muscles")) if m not in muscles]

    if dry_run:
        return {"name": name, "category": category_id,
                "equipment": [equipment] if equipment else [],
                "muscles": muscles, "muscles_sec": muscles_sec}

    # 1. Ejercicio base
    r = wger_post("exercise/", json_data={
        "category":          category_id,
        "muscles":           muscles,
        "muscles_secondary": muscles_sec,
        "equipment":         [equipment] if equipment else [],
        "license_author":    LICENSE_AUTHOR,
    })
    if not r.ok:
        raise RuntimeError(f"POST exercise/ → {r.status_code}: {r.text[:200]}")
    ex_id = r.json()["id"]

    # 2. Traducciones EN + ES
    created_translation = False
    for lang_code, lang_id in (("en", lang_en), ("es", lang_es)):
        html, raw = build_description(ex, lang_code)
        if not html:
            continue
        tr_name = name if lang_code == "en" else _es_name(ex) or name
        r = wger_post("exercise-translation/", json_data={
            "exercise":           ex_id,
            "language":           lang_id,
            "name":               tr_name,
            "description":        html,
            "description_source": raw,
            "license_author":     LICENSE_AUTHOR,
        })
        if r.ok:
            created_translation = True
        else:
            log.warning(f"  traducción {lang_code} falló: {r.status_code} {r.text[:120]}")
    if not created_translation:
        raise RuntimeError("ninguna traducción creada — wger eliminará el base huérfano")

    # 3. Media: JPG como imagen principal + GIF convertido a MP4 como video
    media = {"jpg": None, "video": None}

    path, mime = download_media(ex.get("image"))
    if path:
        try:
            r_img = upload_image(ex_id, path, mime, True)
            if r_img.ok:
                media["jpg"] = r_img.json().get("image")
            else:
                log.warning(f"  jpg falló para '{name}': {r_img.status_code} {r_img.text[:100]}")
        finally:
            Path(path).unlink(missing_ok=True)

    path, mime = download_media(ex.get("gif_url"))
    if path:
        try:
            with open(path, "rb") as f:
                r_vid = wger_post(
                    "video/",
                    data={"exercise": ex_id, "license": "1",
                          "license_author": LICENSE_AUTHOR},
                    files={"video": (Path(path).name, f, mime)},
                )
            if r_vid.ok:
                media["video"] = r_vid.json().get("video")
            else:
                log.warning(f"  video falló para '{name}': {r_vid.status_code} {r_vid.text[:100]}")
        finally:
            Path(path).unlink(missing_ok=True)

    return {"exercise_id": ex_id, "name": name, **media}


def _es_name(ex):
    """El dataset no trae nombre traducido; usa la primera línea ES si es corta, si no None."""
    return None  # los nombres quedan en EN de momento; traducirlos es una fase posterior


def get_existing_names(lang_en):
    names = set()
    offset = 0
    while True:
        data = wger_get("exercise-translation/",
                        {"format": "json", "limit": 200, "offset": offset, "language": lang_en})
        for t in data.get("results", []):
            names.add(t["name"].strip().lower())
        if not data.get("next"):
            break
        offset += 200
    return names


def clean_test_imports(state):
    imported = state.get("imported", {})
    if not imported:
        log.info("Nada que limpiar.")
        return
    log.info(f"Eliminando {len(imported)} ejercicios…")
    for src_id, info in list(imported.items()):
        ex_id = info["exercise_id"]
        trans = wger_get("exercise-translation/", {"exercise": ex_id, "format": "json"})
        for t in trans.get("results", []):
            wger_delete(f"exercise-translation/{t['id']}/")
        del state["imported"][src_id]
    log.info("Limpieza completa.")


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--limit", type=int)
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--resume", action="store_true")
    p.add_argument("--clean-test", action="store_true")
    p.add_argument("--delay", type=float, default=0.3)
    args = p.parse_args()

    if not WGER_TOKEN and not args.dry_run:
        log.error("Falta WGER_TOKEN (export WGER_TOKEN=…). Genera uno en la UI de wger → API.")
        sys.exit(1)
    if WGER_TOKEN:
        SESSION.headers.update({"Authorization": f"Token {WGER_TOKEN}"})

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    log.addHandler(logging.FileHandler(str(CACHE_DIR / "import.log")))

    try:
        info = wger_get("exercise/?format=json&limit=1")
        log.info(f"✓ wger accesible — {info['count']} ejercicios actuales")
        lang_en, lang_es = resolve_language_ids()
        log.info(f"✓ idiomas: en={lang_en} es={lang_es}")
    except Exception as e:
        log.error(f"No se puede conectar a wger ({WGER_BASE}): {e}")
        sys.exit(1)

    state = load_state()
    if args.clean_test:
        clean_test_imports(state)
        save_state(state)
        return

    exercises = fetch_exercises_json()
    log.info(f"✓ Dataset: {len(exercises)} ejercicios")

    existing = get_existing_names(lang_en)
    done = set(state["imported"].keys()) if args.resume else set()

    to_process = [ex for ex in exercises
                  if ex["id"] not in done and ex["name"].strip().lower() not in existing]
    if args.limit:
        to_process = to_process[:args.limit]
    log.info(f"→ A importar: {len(to_process)} ({'DRY RUN' if args.dry_run else 'modo real'})")

    ok = err = 0
    for i, ex in enumerate(to_process, 1):
        log.info(f"[{i}/{len(to_process)}] {ex['name']}")
        try:
            result = import_exercise(ex, lang_en, lang_es, dry_run=args.dry_run)
            if args.dry_run:
                log.info(f"  [DRY] {result}")
                continue
            state["imported"][ex["id"]] = result
            ok += 1
            log.info(f"  ✓ wger={result['exercise_id']} jpg={'✓' if result['jpg'] else '✗'} "
                     f"video={'✓' if result['video'] else '✗'}")
        except Exception as e:
            err += 1
            state["failed"].append({"id": ex["id"], "name": ex["name"], "error": str(e)})
            log.error(f"  ✗ {e}")
        if not args.dry_run:
            save_state(state)
        time.sleep(args.delay)

    log.info(f"\nCOMPLETADO: {ok} ok | {err} errores | estado: {STATE_FILE}")


if __name__ == "__main__":
    main()
