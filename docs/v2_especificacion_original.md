# Especificación de Requerimientos de Software: Ecosistema Pegasus Fit (v2.0)
*Documento Unificado de Requerimientos Funcionales, No Funcionales, Arquitectura Tecnológica y Especificación de Experiencia de Usuario (UX/UI).*

---

## 1. Información General del Proyecto

*   **Nombre Clave del Sistema:** Pegasus Fit
*   **Versión del Documento:** v2.0
*   **Enfoque de Diseño:** Accesibilidad extrema, reducción de carga cognitiva, usabilidad en entornos de alta movilidad y fatiga física.
*   **Objetivo de la Plataforma:** Gestionar de forma híbrida el entrenamiento de fuerza, la logística de acceso a sedes físicas y el acompañamiento deportivo digital de los usuarios mediante una interfaz móvil de alto rendimiento.

---

## 2. Arquitectura de Software y Stack Tecnológico

El sistema Pegasus Fit (v2.0) está diseñado bajo una arquitectura de microservicios e integraciones híbridas, con interfaces móviles que garantizan fluidez técnica y visualización multimedia en tiempo real.

| Componente | Tecnología | Propósito y Detalles de Implementación |
| :--- | :--- | :--- |
| **Frontend Mobile** | **Flutter (Dart)** | Compilación nativa para sistemas iOS y Android desde un código base unificado. Modularización de interfaces de usuario mediante paquetes dinámicos optimizados para acelerar los tiempos de renderizado y reducir el consumo de memoria. |
| **Backend / APIs** | **Ruby on Rails** / Microservicios | Orquestación de lógica de negocio, procesamiento de APIs en tiempo real y sincronización segura con sistemas locales de control físico (torniquetes). |
| **Origen / Legado** | **Eokoe** | El identificador del paquete de la app (`com.eokoe.pegasusfitcoach`) conserva sus bases de desarrollo ágil, ahora completamente integradas e iteradas por el equipo de ingeniería de Pegasus Fit. |
| **Integraciones** | APIs de Terceros y SDKs | Enlace con bases de datos de aforo, servidores de streaming de video optimizados y pasarelas de pago seguras de ejecución asíncrona. |

---

## 3. Requerimientos Funcionales (RF)

Los requerimientos funcionales definen los servicios esenciales que Pegasus Fit (v2.0) debe proporcionar a sus usuarios finales e instructores de sala.

```
                      ┌─────────────────────────────────┐
                      │    PEGASUS FIT - PILARES RF     │
                      └────────────────┬────────────────┘
                                       │
        ┌──────────────────┬───────────┴───────────┬──────────────────┐
        ▼                  ▼                       ▼                  ▼
┌──────────────┐   ┌──────────────┐        ┌──────────────┐   ┌──────────────┐
│ Entrenamiento│   │  Logística y │        │ Entrenamiento│   │Administración│
│  y Rutinas   │   │ Acceso Sede  │        │   Híbrido    │   │  y Cuenta    │
└──────────────┘   └──────────────┘        └──────────────┘   └──────────────┘
```

### 3.1 Módulo de Entrenamiento y Rutinas

*   **RF-01: Ficha Dinámica Digital:** El sistema debe mostrar secuencialmente la rutina asignada para el día, detallando el ejercicio, número de series, rango de repeticiones objetivo, tiempos de descanso y peso de referencia.
*   **RF-02: Guías de Ejercicio Multimedia:** El sistema debe reproducir automáticamente en bucle videos cortos de alta definición que demuestren la técnica y postura correcta para cada ejercicio listado.
*   **RF-03: Registro Dinámico de Cargas:** El usuario debe poder capturar y editar en tiempo real el peso (en kg o lb) levantado en cada serie individual.
*   **RF-04: Sincronización en Tiempo Real con Instructores:** Cualquier modificación realizada por el personal de entrenamiento de la sede física en sus terminales locales debe sincronizarse inmediatamente en la aplicación del usuario.
*   **RF-05: Gráficas de Progresión de Fuerza:** La aplicación debe generar gráficos interactivos históricos que ilustren la evolución de cargas levantadas por ejercicio a lo largo del tiempo.

### 3.2 Módulo de Logística y Acceso Físico

*   **RF-06: Semáforo de Ocupación en Tiempo Real:** El sistema debe procesar los datos de entrada/salida de la sede para mostrar la capacidad actual y un histograma de concurrencia predictivo hora por hora.
*   **RF-07: Credencial QR Dinámica:** La aplicación debe generar un código QR dinámico y rotativo (que se actualice cada 15 segundos) para validar el acceso en los torniquetes físicos de las sedes.
*   **RF-08: Agenda de Clases Dirigidas:** El usuario debe poder visualizar el calendario de actividades de salón (Zumba, Yoga, Pegasus Box, etc.), reservar un cupo limitado y cancelar la reserva en caso de ser necesario.

### 3.3 Módulo de Entrenamiento Híbrido (Pegasus Fit Go)

*   **RF-09: Catálogo de Clases On-Demand:** La aplicación debe proveer un repositorio categorizado de sesiones de ejercicio grabadas en formato de video para entrenamiento fuera del gimnasio.
*   **RF-10: Soporte Multidispositivo (Casting):** La aplicación debe permitir la transmisión directa de video a dispositivos de pantalla grande utilizando protocolos Chromecast y AirPlay.

### 3.4 Módulo de Administración y Cuenta

*   **RF-11: Autogestión de Membresía:** El usuario debe poder actualizar su método de pago registrado, editar datos personales y consultar su contrato de servicios deportivos.
*   **RF-12: Historial de Pagos:** El sistema debe permitir consultar y descargar los comprobantes de pago digitales emitidos mensualmente.
*   **RF-13: Congelamiento Digital de Plan:** El usuario (con plan elegible) debe poder solicitar el cese temporal de los cobros y de su acceso directo desde el menú de la aplicación.

### 3.5 Módulo Crítico: Sistema Inteligente de Anamnesis

La anamnesis deportiva de Pegasus Fit actúa como el filtro lógico de onboarding para mitigar riesgos médicos, musculares y legales antes de permitir la generación automatizada de rutinas.

#### Flujo Lógico y Reglas de Negocio (Árbol de Decisión)

```
                  ┌────────────────────────────────────────┐
                  │        INICIO DE LA ANAMNESIS          │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │    Cuestionario de Hábitos y Metas     │
                  │   (Objetivos, Días y Nivel de Fuerza)  │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │   Filtro de Lesiones y Factores Riesgo  │
                  │     ¿Dolores, patologías o embarazo?   │
                  └───────────────────┬────────────────────┘
                                      │
                            ┌_________┴_________┐
                            ▼                   ▼
                         [ SÍ ]               [ NO ]
                            │                   │
                            ▼                   ▼
              ┌────────────────────────┐  ┌────────────────────────┐
              │  Bloqueo de Rutina Aut.│  │ Procesamiento de Metas │
              │   Redirección a Sala   │  │   Asignación de Ficha  │
              │  (Atención Presencial) │  │  Estándar Automatizada │
              └────────────────────────┘  └────────────────────────┘
```

1.  **Entradas del Sistema (Inputs):**
    *   **Objetivos del Usuario:** Ganancia de masa muscular (hipertrofia), pérdida de grasa o acondicionamiento cardiovascular general.
    *   **Frecuencia Semanal:** Cantidad de días disponibles para entrenar (rango de 2 a 5 días).
    *   **Experiencia Deportiva:** Clasificación del perfil (Principiante, Intermedio, Avanzado).
2.  **Filtro de Exclusión por Salud (Regla de Oro):**
    *   La app realiza preguntas directas sobre dolores agudos articulares, hernias diagnosticadas, hipertensión severa, embarazo activo o condiciones cardíacas preexistentes.
    *   **Regla de Negocio SÍ:** Si el usuario declara **SÍ** a cualquiera de estos factores de riesgo, la aplicación bloquea la generación automática por su seguridad y desvía al usuario obligatoriamente a una sesión de evaluación presencial con el instructor calificado de la sala física.
    *   **Regla de Negocio NO:** Si el usuario declara **NO** tener ninguna molestia o lesión, el motor procesa el objetivo y la disponibilidad de días para cargar una rutina automatizada predeterminada de 4 semanas.

---

## 4. Requerimientos No Funcionales (RNF)

Los requerimientos no funcionales garantizan la calidad, seguridad, desempeño y adaptabilidad del sistema bajo condiciones exigentes de uso concurrente.

### 4.1 Rendimiento y Escalabilidad (Performance)
*   **RNF-01: Velocidad de Respuesta:** Las APIs críticas (como validación de QR o aforo de sede) deben responder en un tiempo inferior a los 200 ms bajo condiciones estándar de red.
*   **RNF-02: Consumo de Datos Móviles:** Las guías multimedia deben estar fuertemente optimizadas y comprimidas para consumir el mínimo de ancho de banda móvil de los usuarios. El peso promedio por video de ejercicio no debe exceder los 1.5 MB.
*   **RNF-03: Alta Disponibilidad:** La infraestructura en la nube debe ofrecer un nivel de servicio (SLA) de disponibilidad del 99.9% para evitar interrupciones de acceso a las sedes físicas.

### 4.2 Seguridad y Privacidad
*   **RNF-04: Encriptación de Datos de Salud:** Todas las respuestas de la Anamnesis que involucren información clínica, lesiones o condiciones médicas de los usuarios deben encriptarse tanto en tránsito (TLS 1.3) como en reposo (AES-256).
*   **RNF-05: QR Antifraude:** Los códigos QR de acceso deben invalidarse automáticamente después de 15 segundos de ser generados para impedir capturas de pantalla o duplicación de accesos.
*   **RNF-06: Protección Financiera:** El procesamiento de cobros debe cumplir rigurosamente con los estándares PCI-DSS para asegurar la información de tarjetas de crédito o débito de los usuarios.

### 4.3 Compatibilidad y Portabilidad
*   **RNF-07: Soporte de Sistemas Operativos:** La aplicación debe ser compatible de forma nativa y ofrecer una experiencia homogénea en iOS (versión 15.0 o superior) y Android (versión 8.0 u Oreo o superior).
*   **RNF-08: Protocolos de Transmisión:** El reproductor multimedia debe soportar transmisiones nativas a Chromecast de Google y AirPlay de Apple.

---

## 5. Especificaciones de Diseño de Experiencia de Usuario (UX/UI)

El diseño de Pegasus Fit se construye con un enfoque orientado a la movilidad extrema y a la fatiga física. Los usuarios en el gimnasio a menudo operan el teléfono con manos sudorosas, en constante movimiento y con música de fondo. Por ende, la interfaz debe mitigar al máximo la carga cognitiva.

### 5.1 Pantalla: Mi Rutina Diaria (Ficha Dinámica)

Esta pantalla es el área crítica de trabajo del usuario. Se prioriza un control fluido a una sola mano.

*   **Cabecera Persistente:** Muestra de forma concisa el avance actual (ej. "Ejercicio 3 de 6") mediante una barra de progreso lineal de alto contraste, complementada por un cronómetro del tiempo transcurrido total de la sesión.
*   **Tarjeta de Enfoque Principal (Foco Visual al 60%):**
    *   **Reproductor multimedia superior:** Relación de aspecto 16:9 con bordes redondeados (8px) que muestra un bucle de video optimizado de la técnica. **Regla de UX:** El video se reproduce silenciado de forma predeterminada para no interrumpir el audio o música activa que el usuario escuche en sus auriculares.
    *   **Tipografía de Alto Contraste:** Título del ejercicio en tamaño grande (22sp-24sp) en negrita, acompañado de una sola línea guía legible a distancia (ej. *“Mantén la espalda recta contra el banco”*).
*   **Control Inteligente de Series (Tabla de Datos Interactiva):**
    *   En lugar de múltiples inputs pequeños que dificulten la escritura, cada serie pendiente de realizar presenta un campo de entrada que activa un **teclado numérico personalizado en pantalla** con grandes botones de incremento de `+` y `-` (escalonados por defecto a 2.5 kg). Esto previene que el teclado nativo del sistema bloquee visualmente la ficha.
    *   Al registrar con éxito una serie presionando el botón de confirmación de 48x48 dp, la app inicia inmediatamente la lógica de recuperación.
*   **Temporizador de Recuperación Integrado:** La pantalla activa un overlay sutil con una cuenta regresiva visual gigante. El teléfono produce una vibración háptica suave al llegar a cero y se autodesarta de forma automática para dar paso inmediato a la serie o ejercicio consecutivo sin requerir toques extra por parte del usuario.

### 5.2 Pantalla: Semáforo de Aforo y QR Dinámico (Logística)

Diseñada para una interacción rápida y sin fricción a la entrada de la sede física.

*   **Acceso Rápido Invisible:** Un menú desplegable (*Bottom Sheet*) accesible desde cualquier sección de la app mediante un simple gesto de arrastre ascendente (*swipe up*) revela la credencial digital en menos de un segundo.
*   **Código QR de Alta Legibilidad:**
    *   El contenedor del código QR debe ser de fondo blanco puro, forzando de forma temporal el brillo de la pantalla del terminal al 100% para evitar lecturas fallidas en escáneres de torniquetes de bajo costo.
    *   Presenta una barra de carga decreciente justo debajo, que indica de forma intuitiva los segundos restantes antes de que el código expire y se regenere.
*   **Indicador Visual Semafórico de Capacidad:**
    *   Señala de forma directa la ocupación actual mediante badges con colores de alerta estandarizados:
        *   🟢 **Bajo Aforo (Menor al 40%):** Sede despejada para entrenar.
        *   🟡 **Aforo Moderado (40% - 70%):** Sede con flujo normal.
        *   🔴 **Alto Aforo (Mayor al 70%):** Sede muy concurrida.
    *   Complementado por un histograma minimalista interactivo que muestra las proyecciones horarias del día actual para facilitar la planificación de entrenamientos.

### 5.3 Pantalla: Flujo Dinámico de Anamnesis (Onboarding)

El onboarding prioriza un estilo conversacional y amigable, dividiendo las secciones para evitar abrumar al usuario con encuestas masivas tradicionales.

*   **Navegación Unidireccional:** Barra superior de progreso discreta (ej. "Paso 2 de 5") que incluye un botón de "Atrás" claro para enmendar errores de selección accidentales.
*   **Botones Tipo Píldora de Gran Escala:** Se reemplazan las casillas de verificación clásicas por tarjetas interactivas de gran formato que abarcan el ancho completo de la pantalla y reaccionan al tacto con una microanimación física de profundidad.
*   **Manejo de Erre-Safe en Exclusión:** Si el usuario selecciona una respuesta afirmativa a alguna dolencia crítica (ej. *“Sí, tengo molestias de rodilla o espalda”*), la app evita un error técnico frío. Transiciona mediante un barrido lateral limpio hacia una pantalla de apoyo personalizada que explica el motivo de seguridad y activa un único botón primario destacado: **"Entendido, reservar apoyo en sala"** para agilizar la interacción personalizada presencial.

---

## 6. Alternativas de Código Abierto (Open Source) para el Desarrollo

Para proyectos similares o integraciones independientes inspiradas en la arquitectura Pegasus Fit, se recomiendan los siguientes componentes de código abierto para replicar las lógicas de interacción y onboarding analizadas:

### 6.1 Diseño y Lógica del Formulario Dinámico (Anamnesis)
*   **SurveyJS (Librerías de Encuesta JSON):** Motor excelente para renderizar cuestionarios dinámicos de alto nivel en Angular, React, Vue o JavaScript nativo. Facilita la configuración lógica condicional del cuestionario sin necesidad de reescribir código en el frontend (ej. *"Si el usuario responde dolor = Sí, saltar directamente a la pantalla de redirección y ocultar el resto"*).
*   **Form.io:** Plataforma de gestión de formularios drag-and-drop con soporte para despliegue autohospedado que asegura el cumplimiento de políticas locales de manejo de datos de salud en el servidor backend.

### 6.2 Motor de Inferencia y Asignación de Rutinas (Lógica de Decisión)
*   **json-rules-engine (JavaScript / TypeScript):** Motor de reglas de negocio ultraligero que permite desacoplar los flujos condicionales complejos del código de producción de la aplicación mediante la estructuración de condiciones legibles en formato JSON.
    *   *Ejemplo Práctico de Regla Condicional de Asignación:*
        ```json
        {
          "conditions": {
            "all": [
              { "fact": "objetivo", "operator": "equal", "value": "hipertrofia" },
              { "fact": "frecuencia_semanal", "operator": "equal", "value": 3 },
              { "fact": "lesiones", "operator": "equal", "value": false }
            ]
          },
          "event": {
            "type": "asignar_rutina_push_pull_legs",
            "params": { "nivel": "principiante" }
          }
        }
        ```
*   **Experta (Python):** Sistema experto de toma de decisiones basado en reglas avanzadas para modelar lógicas y perfiles de entrenamiento de manera ágil y escalable en arquitecturas de backend construidas en Python.
