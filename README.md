# Pegasus Fit

Plataforma híbrida de gimnasio: rutinas de fuerza con guía multimedia, acceso físico por QR, aforo en tiempo real, clases on-demand y nutrición (Motor Artemis).

**Core de dominio:** [wger](https://wger.de) (desplegado en infra propia) · **Frontend:** Angular + Capacitor · **BFF:** NestJS (propuesto) · **Catálogo de ejercicios:** [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) (1,324 ejercicios, media © GymVisual).

## Documentación

- [`docs/especificacion_v3.md`](docs/especificacion_v3.md) — **spec vigente**: funcionalidades priorizadas y análisis desde 4 perspectivas (entrenador, UX, arquitectura, nutrición), anclada a la auditoría real de infraestructura (2026-07-15).
- [`docs/v2_especificacion_original.md`](docs/v2_especificacion_original.md) — spec anterior (referencia histórica).

## Herramientas

- [`tools/match_dataset_wger.py`](tools/match_dataset_wger.py) — cruce de nombres dataset ↔ wger que fundamentó la decisión de catálogo (§3.4 de la spec).
- `tools/exercises_dataset.json` — snapshot del dataset (2026-07-15).

## Decisiones clave (v3)

1. wger es el core: solo se construye lo que no cubre (QR/torniquetes, aforo, reservas, pagos, motor de anamnesis).
2. Angular + Capacitor en lugar de Flutter (equipo y app Artemis ya son Angular).
3. El dataset es el catálogo canónico de ejercicios: se importa a wger (el cruce dio solo 9 % de coincidencia — depurar era inviable).
4. Anamnesis basada en PAR-Q+; datos clínicos cifrados en el BFF, nunca en wger.
5. Nutrición sobre estándares (Mifflin-St Jeor, ISSN, Open Food Facts) — Artemis es la capa de reglas, no un estándar nuevo.
