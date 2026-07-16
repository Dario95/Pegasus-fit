# Pegasus Fit — Especificación v3.0

*Revisión multidisciplinaria de la spec v2, anclada al estado **real** de la infraestructura (auditoría del NAS 2026-07-15) y al dataset de ejercicios elegido. Reemplaza las suposiciones de la v2 por decisiones verificadas.*

---

## 0. Resumen ejecutivo

Pegasus Fit es una plataforma híbrida de gimnasio: rutinas de fuerza con guía multimedia, acceso físico por QR, aforo en tiempo real, clases on-demand y autogestión de membresía. La v3 introduce tres correcciones de rumbo respecto a la v2:

1. **El core de dominio no se construye: es wger** (ya desplegado y corriendo). El desarrollo propio se concentra en lo que wger no tiene: acceso físico, aforo, reservas, pagos y la capa de experiencia móvil.
2. **El stack de frontend pasa de Flutter a Angular + Capacitor** — alineado con el equipo (Artemis ya es Angular en producción) y con un solo código para web/iOS/Android.
3. **El catálogo de ejercicios se reconstruye desde el dataset** `hasaneyldrm/exercises-dataset` (1,324 ejercicios con imagen + GIF + instrucciones en 9 idiomas, incluido español), en lugar de depurar el catálogo actual de wger — el cruce real de nombres demostró que depurar dejaría un catálogo inservible (§3.4).

### Funcionalidades principales (priorizadas)

| # | Funcionalidad | Origen | Prioridad |
|---|---|---|---|
| F1 | Ficha diaria de entrenamiento (ejercicio, series, reps, peso, descanso) con registro de cargas serie a serie | wger (rutinas) + UI propia | P0 |
| F2 | Guía visual por ejercicio (GIF/loop mudo + una línea de técnica) | dataset importado a wger | P0 |
| F3 | Onboarding con anamnesis (filtro de riesgo → rutina automática o derivación a sala) | motor propio de reglas | P0 |
| F4 | Progresión de cargas y gráficas históricas | wger (logs) + UI propia | P1 |
| F5 | QR dinámico de acceso + integración torniquetes | servicio propio | P1 |
| F6 | Semáforo de aforo + histograma predictivo | servicio propio | P1 |
| F7 | Reserva de clases dirigidas | servicio propio (wger no lo cubre) | P2 |
| F8 | Clases on-demand con casting | servidor de video + Capacitor plugins | P2 |
| F9 | Membresía: pagos, historial, congelamiento | pasarela externa (PCI delegado) | P2 |
| F10 | Motor Artemis (nutrición) | wger nutrition + motor propio de cálculo | P2 |

---

## 1. Perspectiva del Entrenador

*Qué necesita el entrenamiento real que la v2 no cubría.*

### 1.1 Lo que la v2 hace bien
- Ficha secuencial con video mudo por defecto y una sola línea de técnica: correcto — en sala nadie lee párrafos.
- Temporizador de descanso automático con vibración: correcto y crítico — el descanso es la variable que los usuarios peor gestionan.
- Bloqueo por anamnesis con derivación presencial: éticamente correcto y protege al negocio.

### 1.2 Carencias detectadas y correcciones

**a) La progresión no puede ser solo un gráfico.** La v2 registra cargas (RF-03) y las grafica (RF-05), pero no define *cómo progresa* el usuario. Sin regla de progresión, la rutina de 4 semanas se estanca. Propuesta: **doble progresión** como regla por defecto — el usuario tiene un rango de reps (ej. 8–12); cuando completa el tope del rango en todas las series, la app sugiere +2.5 kg la siguiente sesión. Es simple de explicar, simple de codificar (una regla sobre los logs que ya guarda wger) y es el estándar de facto para principiantes/intermedios.

**b) Las plantillas por frecuencia deben ser explícitas.** La anamnesis pregunta días disponibles (2–5) pero la v2 no define qué entrega. Mapeo estándar:
- 2 días → Full Body A/B
- 3 días → Full Body A/B/C o Push/Pull/Legs
- 4 días → Upper/Lower ×2
- 5 días → Upper/Lower + PPL híbrido

**c) Falta la semana de descarga (deload).** Rutinas automatizadas de 4 semanas encadenadas sin deload = usuarios estancados o lesionados en el mes 3. Cada 4ª o 5ª semana: mismas sesiones al 60–70 % de carga. Es una regla más del motor, no una feature grande.

**d) La anamnesis no hay que inventarla: existe el estándar PAR-Q+.** El *Physical Activity Readiness Questionnaire* (PAR-Q+ 2024) es el cuestionario validado internacionalmente para cribado pre-ejercicio: 7 preguntas generales y ramificación solo si hay algún "sí". Adoptarlo como base de la anamnesis da respaldo legal y clínico al flujo de bloqueo/derivación que la v2 ya describía (su regla de oro coincide: cualquier "sí" → evaluación presencial). Las preguntas de objetivos/frecuencia/experiencia van después del PAR-Q+, no mezcladas.

**e) El instructor necesita su vista.** RF-04 (sincronización instructor→app) implica una interfaz de instructor que la v2 nunca especifica. wger ya trae gestión de rutinas vía su admin/API para un rol "entrenador" (modo gimnasio con miembros): usarla como terminal del instructor en fase 1 en vez de construir un panel propio.

**f) Señales de estancamiento para el instructor.** Con los logs en wger, una consulta detecta usuarios sin progresión en 3 semanas o con adherencia < 50 % → lista de "atención requerida" para el instructor. Barato de construir, altísimo valor de retención.

---

## 2. Perspectiva del Experto UX

*Cómo entregar esto en multidispositivo con Angular + Capacitor.*

### 2.1 Veredicto sobre Angular + Capacitor: sí, con condiciones

Cambiar Flutter → **Angular + Capacitor** es la decisión correcta *para este equipo*:
- Artemis ya está construida en Angular y desplegada; el equipo domina el framework (no se paga curva de aprendizaje).
- Un solo código: PWA para web/escritorio del instructor + apps nativas iOS/Android empaquetadas con Capacitor.
- Los requisitos nativos de la spec tienen plugin Capacitor directo: háptica (`@capacitor/haptics`), brillo forzado para el QR (`@capacitor-community/screen-brightness`), teclado propio (se evita el nativo con UI web), push (`@capacitor/push-notifications`).

**Condiciones/riesgos a vigilar:**
1. **Casting (RF-10):** es el punto débil del stack. AirPlay/Chromecast no tienen plugin Capacitor de primera línea; existe `capacitor-chromecast` (comunidad) y para AirPlay lo práctico es delegar en el reproductor nativo del sistema. Alternativa pragmática: el usuario castea desde la app del servidor de video (Jellyfin ya corre en el NAS y castea nativamente) y Pegasus solo deep-linkea. Decidir en spike técnico antes de comprometer RF-10.
2. **Rendimiento de listas y cronómetros:** Angular con zoneless/signals (v18+) y `OnPush` en toda la ficha de entrenamiento. El cronómetro de descanso debe correr aunque la app pase a background: usar plugin de background task + notificación local, no `setInterval`.
3. **Offline-first no es opcional** (§3.2): la sala del gimnasio es un sótano con mala señal. PowerSync (ya desplegado junto a wger) o cache propia con cola de escrituras.

### 2.2 Sistema de diseño para "manos sudorosas"

Se mantienen los principios v2 (foco 60 %, tipografía 22sp+, targets 48dp) y se agregan reglas multidispositivo:

- **Grid responsivo de 3 cortes:** teléfono (una columna, pulgar), tablet/terminal instructor (dos columnas: lista de socios + detalle), TV/cast (solo reproductor, cero UI táctil).
- **Modo guante/sudor:** todos los targets críticos de la ficha ≥ 56dp; acciones destructivas (borrar serie) requieren swipe, no tap, para evitar toques fantasma.
- **Tema oscuro por defecto en sala** (pantallas AMOLED, menos deslumbramiento en ambiente de gym oscuro), claro para el flujo administrativo.
- **Estados offline visibles:** badge persistente "sin conexión — se sincronizará" en vez de spinners bloqueantes; la ficha funciona 100 % offline.
- **El QR es la pantalla más frecuente → la más rápida:** gesto swipe-up global (bottom sheet) como en v2, pre-renderizado al abrir la app, brillo al 100 % solo mientras el sheet está visible.
- **Los GIFs 180×180 del dataset pesan poco (~100–300 KB):** precargar los del día al abrir la ficha (10 archivos ≈ 2–3 MB) y cachear en disco — cumple RNF-02 sin servidor de streaming para las guías.

### 2.3 Anamnesis conversacional
Se mantiene el diseño v2 (píldoras grandes, paso a paso, pantalla de contención al derivar a sala) con dos ajustes: (1) el orden clínico del PAR-Q+ manda sobre el orden "de marketing"; (2) guardar progreso parcial — si el usuario abandona en el paso 3, retomar ahí.

---

## 3. Perspectiva del Arquitecto de Software

*wger como core: qué da gratis, qué falta, y las limitaciones reales medidas en el NAS.*

### 3.1 Estado actual verificado (auditoría 2026-07-15)

| Componente | Estado en el NAS (192.168.2.40) |
|---|---|
| `wger-web-1` | `wger/server:latest`, puerto 8000, healthy |
| `wger-db-1` | Postgres 15-alpine, healthy. Catálogo: 1,699 ejercicios, 5,222 traducciones, 1,158 imágenes, 73 videos |
| `wger-cache-1` | Redis, healthy |
| `wger-powersync-1` | PowerSync service, puerto 8098 — **ya hay infraestructura de sync offline-first** |
| `artemis` | nginx sirviendo build Angular (puerto 8099, ruta `/informes` en uso desde móviles de la LAN) |
| Jellyfin | 10.10.7 — candidato directo para clases on-demand (F8) |
| Host | Ubuntu, 4 cores, 15 GB RAM |

### 3.2 Qué cubre wger de la spec (no construir)

- **Usuarios, rutinas, días, series, reps, pesos, logs de entrenamiento** → F1, F4 completos vía API REST (`/api/v2/`), con tokens JWT.
- **Catálogo de ejercicios multiidioma con imágenes/videos** → F2 (tras el reemplazo de catálogo, §3.4).
- **Modo gimnasio:** gestión de miembros, roles entrenador/gerente, notas y documentos por socio → terminal del instructor (RF-04) sin desarrollo propio en fase 1.
- **Módulo de nutrición:** planes, comidas, ingredientes (integra Open Food Facts), cálculo calórico → base del Motor Artemis (§4).
- **PowerSync ya desplegado** → sincronización bidireccional instructor↔app en tiempo real (RF-04) y offline-first del lado móvil, contra el Postgres de wger.

### 3.3 Qué NO cubre wger (backlog de desarrollo propio)

| Gap | Solución propuesta |
|---|---|
| QR dinámico + torniquetes (F5) | Microservicio propio (TOTP con ventana de 15 s sobre el user-id de wger; el torniquete valida contra el servicio, no contra wger) |
| Aforo en tiempo real (F6) | El mismo servicio de acceso emite eventos entrada/salida → contador Redis + histórico en Postgres para el histograma predictivo |
| Reserva de clases con cupo (F7) | Servicio propio pequeño (tabla clases/cupos/reservas) — wger no tiene reservas |
| Pagos y membresías (F9) | **No construir cobro propio**: pasarela local (según país) con tokenización — PCI-DSS queda del lado de la pasarela. wger guarda solo el estado de la membresía |
| Video on-demand (F8) | Jellyfin existente + deep-link desde la app (spike de casting, §2.1) |
| Motor de reglas de anamnesis (F3) | `json-rules-engine` como proponía la v2, corriendo en el BFF |

**Patrón recomendado:** un **BFF (Backend for Frontend)** delgado — NestJS para mantener todo el stack en TypeScript/Angular — que orquesta wger + servicios propios y expone una sola API a la app. La app nunca habla con 4 backends distintos. (La v2 proponía Rails: se descarta por la misma razón que Flutter — el equipo es Angular/TS.)

### 3.4 Catálogo de ejercicios: resultado del cruce y decisión

Cruce real (2026-07-15) entre los 1,696 nombres EN de wger y los 1,324 del dataset, con normalización:

- Match exacto: **157** (9 % del dataset)
- Match fuzzy ≥ 0.9: +54, con falsos positivos evidentes ("back **pec** stretch" ↔ "back **neck** stretch")

**Conclusión: la estrategia v2 ("depurar wger dejando solo ejercicios con imagen del dataset") es inviable** — dejaría ~150–200 ejercicios y descartaría el 85 % del dataset comprado en imágenes.

**Decisión v3 — invertir la dirección:** el dataset es el catálogo canónico.
1. Backup completo de la BDD wger (`pg_dump`) antes de tocar nada.
2. Vaciar el catálogo actual de wger (ejercicios/traducciones/imágenes; **no** tocar usuarios ni logs — hoy no hay rutinas en producción que dependan de los IDs viejos; verificar antes con un `SELECT` sobre logs/rutinas).
3. Importar los 1,324 del dataset vía API de wger: ejercicio base (categoría, equipo, músculos mapeados desde `body_part`/`target`/`secondary_muscles`) + traducciones EN/ES desde `instruction_steps` + imagen JPG y GIF como media.
4. Guardar el `id` del dataset como referencia cruzada (campo license/aliases de wger) para trazabilidad y futuras actualizaciones del dataset.
5. Mantener la atribución "© GymVisual" que exige la licencia (MIT solo cubre estructura/textos).

Se requiere una **tabla de mapeo** dataset→wger para `body_part` (10 valores) → categorías wger y `target` (~20 músculos) → `exercises_muscle`. Es trabajo de una tarde y queda versionada en el repo.

### 3.5 Limitaciones de infraestructura (medidas, no supuestas)

⚠️ El NAS **hoy no puede ser el entorno de producción**:
- Load average **8.3 sostenido con 4 cores** (2× sobresuscrito); dockerd al 85 % de CPU y un ffmpeg permanente compitiendo.
- **Swap al 94 %** (3.8/4 GB) con 15 GB de RAM: presión de memoria real; 3 procesos zombie; syncthing en crash-loop.
- ~50 contenedores conviven sin límites de recursos: cualquier pico de Jellyfin/transcodes degrada wger (RNF-01: 200 ms serían incumplibles).
- `wger/server:latest` sin pin de versión = actualizaciones sorpresa; riesgo directo sobre la API.

**Acciones:** (1) pin de versiones de imagen; (2) `deploy.resources.limits` para el stack wger; (3) para el MVP el NAS sirve como *staging*; producción real necesita un host dedicado (VPS o mini-PC) con la misma composición docker — la arquitectura no cambia, solo el host; (4) resolver el crash-loop de syncthing y el ffmpeg residente (probablemente un job de music-uploader/metube colgado).

---

## 4. Perspectiva del Nutricionista — Motor Artemis

*No inventar el estándar: ya existe. El valor está en la capa de reglas y la localización.*

### 4.1 Lo que ya está estandarizado (usar, no diseñar)

1. **Gasto energético basal:** ecuación de **Mifflin-St Jeor** (estándar clínico actual, sustituye a Harris-Benedict): `10·peso + 6.25·talla − 5·edad + s` (s = +5 hombres, −161 mujeres).
2. **TDEE:** multiplicadores de actividad (1.2 sedentario → 1.725 muy activo), ajustables por los días de entrenamiento declarados en la anamnesis (dato que ya tenemos).
3. **Objetivo calórico por meta:** hipertrofia +10–15 % sobre TDEE; pérdida de grasa −15–20 %; recomposición/acondicionamiento ≈ TDEE.
4. **Proteína (posición ISSN):** 1.6–2.2 g/kg/día entrenando fuerza (2.2–2.6 en déficit agresivo); grasas 0.8–1 g/kg mínimo; el resto carbohidratos.
5. **Base de alimentos:** wger ya integra **Open Food Facts** (con buena cobertura de productos de LATAM por código de barras) — no construir base de alimentos propia.

### 4.2 Lo que sí es diseño propio (el motor)

Artemis = capa de reglas sobre esos estándares, como servicio del BFF:

```
Inputs:  anamnesis (edad, sexo, peso, talla, días, objetivo, exclusiones)
Paso 1:  BMR (Mifflin-St Jeor) → TDEE (multiplicador por frecuencia real, no declarada)
Paso 2:  kcal objetivo según meta (+/- %)
Paso 3:  macros (proteína g/kg → grasas g/kg → resto CHO)
Paso 4:  plan de comidas en wger (nutrition plan vía API) distribuido
         en N comidas según preferencia del usuario
Salida:  plan editable en la app + semáforo diario de adherencia
```

**Reglas de seguridad (espejo de la anamnesis):** embarazo, TCA declarado, diabetes u otra condición metabólica → Artemis no genera plan; deriva a profesional. Nunca bajar de 1,200/1,500 kcal (mujer/hombre) sin supervisión. Recalcular TDEE cada 4 semanas con el peso actualizado (la adherencia real corrige al multiplicador teórico).

**Nota de alcance legal:** Artemis genera *orientación nutricional general*, no prescripción — el copy de la app debe decirlo explícitamente (misma filosofía que el límite clínico de la anamnesis).

### 4.3 Relación con la app Artemis existente
El contenedor `artemis` del NAS ya sirve un frontend Angular con informes en uso. Decisión pendiente: ¿Artemis-app absorbe el motor como módulo, o el motor nace en el BFF y Artemis-app lo consume? Recomendación: **motor en el BFF** (una sola fuente de cálculo para Pegasus y Artemis), la app existente queda como cliente.

---

## 5. Requerimientos no funcionales (delta vs v2)

Se mantienen RNF-01..08 con estos ajustes de realidad:
- **RNF-01 (200 ms):** alcanzable solo con QR validado en el servicio de acceso (Redis local al torniquete), no vía wger. Medir con el NAS descargado o el host dedicado.
- **RNF-02 (videos ≤ 1.5 MB):** los GIF del dataset (180×180) ya cumplen; para clases on-demand (F8) es Jellyfin quien transcodea.
- **RNF-04 (salud cifrada):** las respuestas PAR-Q+ viven en el BFF cifradas (AES-256 at rest), **no** en wger — wger solo recibe la rutina resultante, nunca el dato clínico. Minimiza superficie y cumple mejor el principio de mínimo necesario.
- **Nuevo RNF-09 (offline):** la ficha de entrenamiento debe ser 100 % funcional sin red y sincronizar al recuperarla (PowerSync).
- **Nuevo RNF-10 (versionado):** imágenes docker con tag fijo; el catálogo de ejercicios versionado contra el commit del dataset importado.

---

## 6. Roadmap propuesto

| Fase | Entrega | Contenido |
|---|---|---|
| 0 | Semana 1 | Backup wger · pin de versiones · límites de recursos · tabla de mapeo dataset→wger |
| 1 | Semanas 2–3 | Importador del catálogo (1,324 ejercicios) + verificación visual · esqueleto Angular+Capacitor · BFF NestJS con auth contra wger |
| 2 | Semanas 4–6 | Ficha diaria offline-first (F1/F2) + anamnesis PAR-Q+ con motor de reglas (F3) |
| 3 | Semanas 7–9 | Progresión y gráficas (F4) · terminal instructor (modo gimnasio wger) · spike de casting |
| 4 | Semanas 10+ | QR/aforo (F5/F6) con hardware real · reservas (F7) · Artemis motor (F10) · pagos (F9) |

---

## Anexos
- `v2_especificacion_original.md` — spec anterior (referencia histórica).
- Cruce dataset↔wger: script y resultados en `tools/` (pendiente de commit).
- Dataset: [hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset) — MIT (estructura/textos), media © GymVisual con permiso de redistribución, atribución obligatoria.
