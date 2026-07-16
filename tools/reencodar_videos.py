#!/usr/bin/env python3
"""
Re-codifica los videos del catálogo wger con calidad mejorada, vía API.

Problema: la conversión GIF→MP4 original usó los defaults de x264 (CRF 23 a
180px) → ~29 kbps, bordes lavados por el submuestreo 4:2:0. Receta nueva:
reescalado 2x (360x360, Lanczos) ANTES de comprimir + CRF 16 → nítido y sigue
pesando ~40 KB.

No necesita acceso al NAS: baja el GIF original del dataset, codifica local y
reemplaza el video por el API (DELETE + POST). Reanudable (state en .reencode/).

Uso:
  export WGER_BASE=https://gym.soyelhomeroa.qzz.io/api/v2
  export WGER_TOKEN=<token admin>
  python3 reencodar_videos.py [--limit N] [--dry-run]
"""

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import requests

WGER_BASE = os.environ.get('WGER_BASE', 'https://gym.soyelhomeroa.qzz.io/api/v2')
WGER_TOKEN = os.environ.get('WGER_TOKEN', '')
REPO_RAW = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main'
DATASET = Path(__file__).parent / 'exercises_dataset.json'
STATE_DIR = Path(__file__).parent / '.reencode'
STATE = STATE_DIR / 'state.json'
LICENSE_AUTHOR = '© GymVisual — via hasaneyldrm/exercises-dataset'

S = requests.Session()
S.headers.update({'Authorization': f'Token {WGER_TOKEN}'})


def norm(s: str) -> str:
    return re.sub(r'\s+', ' ', s.strip().lower())


def cargar_estado():
    if STATE.exists():
        return json.loads(STATE.read_text())
    return {'hechos': [], 'fallidos': []}


def paginar(path, params):
    offset = 0
    while True:
        r = S.get(f'{WGER_BASE}/{path}', params={**params, 'limit': 100, 'offset': offset}, timeout=30)
        r.raise_for_status()
        d = r.json()
        yield from d['results']
        if not d.get('next'):
            break
        offset += 100


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--limit', type=int)
    p.add_argument('--dry-run', action='store_true')
    args = p.parse_args()

    if not WGER_TOKEN:
        sys.exit('Falta WGER_TOKEN')
    STATE_DIR.mkdir(exist_ok=True)
    estado = cargar_estado()
    hechos = set(estado['hechos'])

    # nombre EN normalizado → gif_url del dataset
    dataset = {norm(e['name']): e['gif_url'] for e in json.loads(DATASET.read_text())}

    # ejercicio wger → nombre EN + video actual
    print('Cargando catálogo wger…', flush=True)
    trabajos = []
    for ex in paginar('exerciseinfo/', {'format': 'json'}):
        if not ex.get('videos'):
            continue
        en = next((t['name'] for t in ex['translations'] if t['language'] == 2), None)
        gif = dataset.get(norm(en or ''))
        if gif:
            trabajos.append({'exercise': ex['id'], 'video_id': ex['videos'][0]['id'], 'gif': gif, 'nombre': en})
    trabajos = [t for t in trabajos if str(t['exercise']) not in hechos]
    if args.limit:
        trabajos = trabajos[: args.limit]
    print(f'A re-codificar: {len(trabajos)}', flush=True)
    if args.dry_run:
        for t in trabajos[:10]:
            print('  ', t)
        return

    ok = err = 0
    for i, t in enumerate(trabajos, 1):
        try:
            gif_bytes = requests.get(f"{REPO_RAW}/{t['gif']}", timeout=60).content
            with tempfile.TemporaryDirectory() as tmp:
                gif = Path(tmp) / 'in.gif'
                mp4 = Path(tmp) / 'out.mp4'
                gif.write_bytes(gif_bytes)
                subprocess.run(
                    ['ffmpeg', '-y', '-loglevel', 'error', '-i', str(gif),
                     '-movflags', 'faststart', '-pix_fmt', 'yuv420p',
                     '-vf', 'scale=360:360:flags=lanczos',
                     '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', str(mp4)],
                    check=True, capture_output=True,
                )
                # Reemplazo: primero sube el nuevo, luego borra el viejo
                with open(mp4, 'rb') as f:
                    r = S.post(f'{WGER_BASE}/video/',
                               data={'exercise': t['exercise'], 'license': '1', 'license_author': LICENSE_AUTHOR},
                               files={'video': ('video.mp4', f, 'video/mp4')}, timeout=60)
                r.raise_for_status()
                S.delete(f"{WGER_BASE}/video/{t['video_id']}/", timeout=30).raise_for_status()
            estado['hechos'].append(str(t['exercise']))
            ok += 1
        except Exception as e:  # noqa: BLE001 — proceso batch: registrar y seguir
            estado['fallidos'].append({'exercise': t['exercise'], 'error': str(e)[:200]})
            err += 1
        if i % 25 == 0 or i == len(trabajos):
            STATE.write_text(json.dumps(estado))
            print(f'[{i}/{len(trabajos)}] ok={ok} err={err}', flush=True)
        time.sleep(0.15)

    STATE.write_text(json.dumps(estado))
    print(f'FIN: {ok} ok, {err} errores', flush=True)


if __name__ == '__main__':
    main()
