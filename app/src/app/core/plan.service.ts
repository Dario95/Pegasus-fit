import { Injectable, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { Anamnesis, DiaPlan, Dieta, EjercicioPlan, Plan } from './models';
import { CAT, EQUIPO_CASA, EjercicioCatalogo, WgerService } from './wger.service';

/**
 * Motor de plan v2 — basado en evidencia. Referencias completas en docs/REFERENCIAS.md.
 *
 * Entrenamiento:
 *  [1] Schoenfeld, Ogborn & Krieger (2016) J Sports Sci — frecuencia ≥2×/semana por
 *      grupo muscular supera 1× para hipertrofia → plantillas Full Body y Upper/Lower
 *      en vez de PPL puro para frecuencias bajas.
 *  [2] Schoenfeld, Ogborn & Krieger (2017) J Sports Sci — dosis-respuesta: ≥10 series
 *      semanales por músculo > <10; el volumen semanal es el driver principal.
 *  [3] Schoenfeld et al. (2016) J Strength Cond Res — descansos de 3 min superan 1 min
 *      en fuerza e hipertrofia en multiarticulares → 150-180 s compuestos, 90 s aislados.
 *  [4] Grgic et al. (2022) J Sport Health Sci — entrenar cerca del fallo (RIR 0-3) es
 *      suficiente; el fallo absoluto no aporta extra y cuesta recuperación → RIR objetivo.
 *  [5] Schoenfeld et al. (2021) Sports Med — hipertrofia similar en rangos amplios de
 *      carga si el esfuerzo es alto; 6-12 reps es lo práctico en sala; resistencia
 *      muscular/acondicionamiento tolera 12-15.
 *
 * Dieta:
 *  [6] Mifflin et al. (1990) Am J Clin Nutr + Frankenfield et al. (2005, revisión ADA) —
 *      Mifflin-St Jeor es la ecuación más precisa en adultos → BMR.
 *  [7] Morton et al. (2018) Br J Sports Med, metaanálisis — beneficio de proteína hasta
 *      ~1.6 g/kg/d (IC superior ~2.2) para masa magra con entrenamiento de fuerza.
 *  [8] Helms et al. (2014) JISSN — en déficit, 2.3-3.1 g/kg de masa magra protege el
 *      músculo → usamos 2.3 g/kg en pérdida de grasa.
 *  [9] Garthe et al. (2011) IJSNEM — pérdida semanal lenta (~0.7 %/sem) conserva más
 *      masa magra que pérdida agresiva → déficit moderado ~20 %.
 * [10] Iraki et al. (2019) Sports (Basel), revisión — superávit pequeño (~10 %,
 *      250-500 kcal) para ganancia con mínimo acúmulo de grasa; grasa dietaria
 *      0.5-1.5 g/kg, nunca <20 % de las kcal.
 * [11] Schoenfeld & Aragon (2018) JISSN — distribución de proteína: ~0.4 g/kg por
 *      comida en ≥4 comidas maximiza la síntesis proteica.
 * [13] Hall et al. (2011) Lancet — la pérdida de peso NO es lineal: el gasto cae
 *      con el peso y la curva se aplana (base del Body Weight Planner del NIH).
 * [14] Rosenbaum & Leibel (2010) Int J Obes — termogénesis adaptativa: tras perder
 *      ~10 % del peso, el gasto cae ~10-15 % más de lo que predice la masa.
 * [15] Kreitzman et al. (1992) Am J Clin Nutr — el glucógeno se almacena con 3-4 g
 *      de agua: la caída rápida de la primera semana es agua, no grasa.
 * [16] Pontzer et al. (2016) Curr Biol — gasto energético restringido: el cuerpo
 *      compensa parte del ejercicio adicional reduciendo otros gastos; junto con
 *      la erosión de adherencia, el déficit efectivo decae con los meses.
 * [17] Ainsworth et al. (2011) Compendium of Physical Activities — entrenamiento
 *      de fuerza ≈ 3.5-6 METs; usamos 4.5 para estimar el costo de la sesión y
 *      derivar las kcal de día de entrenamiento vs día de descanso.
 */

const STORAGE_KEY = 'pegasus.plan';
/** Sube cuando cambie el cálculo de dieta/proyección: los planes guardados se migran solos. */
const VERSION_MOTOR = 4;

interface DiaPlantilla {
  nombre: string;
  cuotas: [number, number][]; // [categoría wger, nº de ejercicios]
}

/**
 * Plantillas por frecuencia. Diseño guiado por [1] (cada músculo ≥2×/semana) y [2]
 * (volumen semanal por músculo en el rango 10-20 series al combinar días × series).
 * 3 días = Full Body A/B/C (frecuencia 3×) — evidencia sobre PPL 1× por músculo [1].
 */
const PLANTILLAS: Record<number, DiaPlantilla[]> = {
  2: [
    { nombre: 'Full Body A', cuotas: [[CAT.PIERNAS, 2], [CAT.PECHO, 1], [CAT.ESPALDA, 1], [CAT.HOMBROS, 1], [CAT.ABS, 1]] },
    { nombre: 'Full Body B', cuotas: [[CAT.PIERNAS, 2], [CAT.ESPALDA, 2], [CAT.PECHO, 1], [CAT.BRAZOS, 1]] },
  ],
  3: [
    { nombre: 'Full Body A', cuotas: [[CAT.PIERNAS, 2], [CAT.PECHO, 1], [CAT.ESPALDA, 1], [CAT.HOMBROS, 1], [CAT.ABS, 1]] },
    { nombre: 'Full Body B', cuotas: [[CAT.PIERNAS, 2], [CAT.ESPALDA, 2], [CAT.PECHO, 1], [CAT.BRAZOS, 1]] },
    { nombre: 'Full Body C', cuotas: [[CAT.PIERNAS, 2], [CAT.PECHO, 1], [CAT.ESPALDA, 1], [CAT.PANTORRILLAS, 1], [CAT.ABS, 1]] },
  ],
  4: [
    { nombre: 'Tren Superior A', cuotas: [[CAT.PECHO, 2], [CAT.ESPALDA, 2], [CAT.HOMBROS, 1], [CAT.BRAZOS, 1]] },
    { nombre: 'Tren Inferior A', cuotas: [[CAT.PIERNAS, 4], [CAT.PANTORRILLAS, 1], [CAT.ABS, 1]] },
    { nombre: 'Tren Superior B', cuotas: [[CAT.ESPALDA, 2], [CAT.PECHO, 2], [CAT.HOMBROS, 1], [CAT.BRAZOS, 1]] },
    { nombre: 'Tren Inferior B', cuotas: [[CAT.PIERNAS, 3], [CAT.PANTORRILLAS, 1], [CAT.ABS, 2]] },
  ],
  5: [
    { nombre: 'Tren Superior', cuotas: [[CAT.PECHO, 2], [CAT.ESPALDA, 2], [CAT.HOMBROS, 1], [CAT.BRAZOS, 1]] },
    { nombre: 'Tren Inferior', cuotas: [[CAT.PIERNAS, 4], [CAT.PANTORRILLAS, 1]] },
    { nombre: 'Empuje', cuotas: [[CAT.PECHO, 2], [CAT.HOMBROS, 2], [CAT.BRAZOS, 1], [CAT.ABS, 1]] },
    { nombre: 'Tirón', cuotas: [[CAT.ESPALDA, 3], [CAT.BRAZOS, 2]] },
    { nombre: 'Pierna + Core', cuotas: [[CAT.PIERNAS, 3], [CAT.PANTORRILLAS, 1], [CAT.ABS, 2]] },
  ],
};

/** Series por ejercicio según experiencia — el volumen total queda dentro de 10-20 series/músculo/semana [2]. */
const SERIES = { principiante: 3, intermedio: 3, avanzado: 4 } as const;

/** RIR objetivo (repeticiones en reserva) [4]. */
const RIR = { principiante: '2–3', intermedio: '1–3', avanzado: '0–2' } as const;

/** Reps según objetivo [5]. */
const REPS = {
  hipertrofia: '6–12',
  perdida_grasa: '8–12',
  acondicionamiento: '12–15',
} as const;

/** Descanso por categoría: compuestos pesados 180 s, medios 120 s, aislados 90 s [3]. */
const DESCANSO_POR_CATEGORIA: Record<number, number> = {
  [CAT.PIERNAS]: 180,
  [CAT.ESPALDA]: 150,
  [CAT.PECHO]: 150,
  [CAT.HOMBROS]: 120,
  [CAT.BRAZOS]: 90,
  [CAT.ABS]: 90,
  [CAT.PANTORRILLAS]: 90,
  [CAT.CARDIO]: 60,
};

@Injectable({ providedIn: 'root' })
export class PlanService {
  private wger = inject(WgerService);
  private auth = inject(AuthService);

  readonly plan = signal<Plan | null>(null);

  constructor() {
    // El plan sigue a la sesión: invitado usa la clave base; al iniciar sesión
    // se adopta el plan de invitado si el usuario aún no tiene uno propio.
    effect(() => {
      const usuario = this.auth.usuario();
      if (usuario) this.adoptarPlanInvitado(usuario.id);
      this.plan.set(this.cargar());
    });
  }

  /** Clave de almacenamiento por usuario; invitado = clave base. */
  private clave(): string {
    const u = this.auth.usuario();
    return u ? `${STORAGE_KEY}::${u.id}` : STORAGE_KEY;
  }

  /** El plan hecho como invitado se guarda para el usuario al registrarse/entrar. */
  private adoptarPlanInvitado(userId: number): void {
    const claveUsuario = `${STORAGE_KEY}::${userId}`;
    const invitado = localStorage.getItem(STORAGE_KEY);
    if (invitado && !localStorage.getItem(claveUsuario)) {
      localStorage.setItem(claveUsuario, invitado);
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  private cargar(): Plan | null {
    try {
      const raw = localStorage.getItem(this.clave());
      if (!raw) return null;
      let plan = JSON.parse(raw) as Plan;
      // Migración: recalcular dieta+proyección con el motor vigente,
      // conservando la rutina (y los swaps) tal como el usuario la dejó
      if ((plan.version ?? 0) < VERSION_MOTOR && plan.anamnesis) {
        plan = { ...plan, dieta: this.calcularDieta(plan.anamnesis), version: VERSION_MOTOR };
        localStorage.setItem(this.clave(), JSON.stringify(plan));
      }
      return plan;
    } catch {
      return null;
    }
  }

  limpiar(): void {
    localStorage.removeItem(this.clave());
    this.plan.set(null);
  }

  async generar(anamnesis: Anamnesis): Promise<Plan> {
    const dias = await this.generarRutina(anamnesis);
    const dieta = this.calcularDieta(anamnesis);
    const plan: Plan = { anamnesis, dias, dieta, generado: new Date().toISOString(), version: VERSION_MOTOR };
    localStorage.setItem(this.clave(), JSON.stringify(plan));
    this.plan.set(plan);
    return plan;
  }

  /**
   * Ajusta el número de ejercicios del día a la duración de sesión preferida:
   * sesiones cortas → menos ejercicios (se preservan las categorías grandes,
   * que van primero en cada plantilla); largas → un ejercicio extra.
   */
  private ajustarCuotas(cuotas: [number, number][], duracion: Anamnesis['duracionSesion']): [number, number][] {
    const copia: [number, number][] = cuotas.map((c) => [...c] as [number, number]);
    const total = () => copia.reduce((s, [, n]) => s + n, 0);
    if (duracion === '30_45') {
      while (total() > 4) {
        const ultima = [...copia].reverse().find(([, n]) => n > 0)!;
        ultima[1] -= 1;
      }
    } else if (duracion === '60_90') {
      copia[0][1] += 1;
    }
    return copia.filter(([, n]) => n > 0);
  }

  private async generarRutina(a: Anamnesis): Promise<DiaPlan[]> {
    const plantilla = PLANTILLAS[a.diasSemana];
    const series = SERIES[a.experiencia];
    const reps = REPS[a.objetivo];
    const usados = new Set<number>();
    const dias: DiaPlan[] = [];

    for (const dia of plantilla) {
      const ejercicios: EjercicioPlan[] = [];
      for (const [categoria, cantidad] of this.ajustarCuotas(dia.cuotas, a.duracionSesion)) {
        let catalogo = await this.wger.porCategoria(categoria);
        if (a.entorno === 'casa') {
          // Solo equipo de casa; los ejercicios sin equipo mapeado (máquinas, cables…) se excluyen
          const enCasa = catalogo.filter((e) => e.equipo.length > 0 && e.equipo.every((id) => EQUIPO_CASA.has(id)));
          if (enCasa.length >= cantidad) catalogo = enCasa;
        }
        for (const ej of this.elegir(catalogo, cantidad, usados)) {
          ejercicios.push({
            wgerId: ej.id,
            nombre: ej.nombre,
            imagen: ej.imagen,
            video: ej.video,
            categoria,
            series,
            reps: `${reps} · RIR ${RIR[a.experiencia]}`,
            descansoSeg: DESCANSO_POR_CATEGORIA[categoria] ?? 90,
          });
        }
      }
      dias.push({ nombre: dia.nombre, ejercicios });
    }
    return dias;
  }

  /**
   * Simulación no lineal de la trayectoria de peso [13][14][15]:
   * - Pérdida: semana 1 incluye caída extra de glucógeno+agua (~1.2 % del peso,
   *   una sola vez [15]); cada semana se recalcula el TDEE al peso actual (Mifflin)
   *   y se aplica termogénesis adaptativa (hasta −15 % del gasto al perder 10 %
   *   del peso [14]) → la curva se aplana sola, como en la vida real [13].
   * - Ganancia: tasa por experiencia con desaceleración suave (el novato gana
   *   más rápido al inicio).
   * Devuelve la curva y la semana en que se alcanza la meta (null si plachea antes).
   */
  /**
   * Trayectoria con forma de decaimiento exponencial ANCLADA en el tiempo:
   * - La forma es la de los modelos de balance energético [13][14][16]: pérdida
   *   rápida al inicio (déficit fresco + adherencia alta) que se aplana al
   *   acercarse a la meta — visiblemente curva, no una recta.
   * - El horizonte total es determinista: ~15 % más que la regla de tres del
   *   ritmo elegido (el costo agregado de adaptación y compensación), así la
   *   estimación no crece con cada refinamiento del modelo.
   * - Semana 1 añade la caída de glucógeno + agua (~1.2 % del peso) [15].
   */
  private simularProyeccion(
    a: Anamnesis,
    _kcalPlan: number,
    _factorActividad: number,
    tasaInicial: number,
  ): { curva: { s: number; p: number }[]; semanasMeta: number | null } {
    const meta = a.pesoObjetivoKg!;
    const perdida = a.objetivo === 'perdida_grasa';
    const agua = perdida ? a.pesoKg * 0.012 : 0;
    const p1 = +(a.pesoKg - agua + tasaInicial).toFixed(2); // peso al final de la semana 1

    // Horizonte anclado: regla de tres del ritmo + 15 % de costo fisiológico
    const restante = Math.abs(meta - p1);
    const T = Math.max(3, Math.ceil(restante / (Math.abs(tasaInicial) * 0.85)) + 1);

    // Curvatura: tasa inicial ≈ 2.2× la tasa final (k = 1.6 / T)
    const k = 1.6 / T;
    const norm = 1 - Math.exp(-k * (T - 1));

    const curva: { s: number; p: number }[] = [{ s: 0, p: a.pesoKg }, { s: 1, p: p1 }];
    for (let s = 2; s <= T; s++) {
      const fraccionRestante = (Math.exp(-k * (s - 1)) - Math.exp(-k * (T - 1))) / norm;
      const peso = meta + (p1 - meta) * fraccionRestante;
      curva.push({ s, p: +peso.toFixed(1) });
    }
    curva[curva.length - 1].p = meta; // aterrizaje exacto
    return { curva, semanasMeta: T };
  }

  private elegir(catalogo: EjercicioCatalogo[], n: number, usados: Set<number>): EjercicioCatalogo[] {
    const disponibles = catalogo.filter((e) => !usados.has(e.id));
    const barajados = [...disponibles].sort(() => Math.random() - 0.5);
    const elegidos = barajados.slice(0, n);
    elegidos.forEach((e) => usados.add(e.id));
    return elegidos;
  }

  /**
   * Alternativas equivalentes para un ejercicio (máquina ocupada / no te gusta):
   * misma categoría muscular, sin repetir nada del plan, priorizando variedad
   * de equipo — si la máquina está ocupada, lo útil es una opción con OTRO equipo.
   */
  async alternativas(ej: EjercicioPlan, n = 6): Promise<EjercicioCatalogo[]> {
    const p = this.plan();
    const enPlan = new Set(p?.dias.flatMap((d) => d.ejercicios.map((e) => e.wgerId)) ?? []);
    let catalogo = (await this.wger.porCategoria(ej.categoria)).filter(
      (e) => e.id !== ej.wgerId && !enPlan.has(e.id),
    );
    if (p?.anamnesis.entorno === 'casa') {
      const enCasa = catalogo.filter((e) => e.equipo.length > 0 && e.equipo.every((id) => EQUIPO_CASA.has(id)));
      if (enCasa.length >= n) catalogo = enCasa;
    }
    const original = await this.buscarEnCatalogo(ej);
    const equipoOriginal = new Set(original?.equipo ?? []);
    const distinto = (e: EjercicioCatalogo) =>
      e.equipo.length !== equipoOriginal.size || e.equipo.some((id) => !equipoOriginal.has(id));
    const barajado = [...catalogo].sort(() => Math.random() - 0.5);
    return [...barajado.filter(distinto), ...barajado.filter((e) => !distinto(e))].slice(0, n);
  }

  private async buscarEnCatalogo(ej: EjercicioPlan): Promise<EjercicioCatalogo | undefined> {
    return (await this.wger.porCategoria(ej.categoria)).find((e) => e.id === ej.wgerId);
  }

  /**
   * Peso inicial sugerido cuando no hay historial: % del peso corporal según
   * la zona muscular, escalado por experiencia y redondeado a 2.5 kg. Es un
   * punto de partida conservador — el usuario ajusta en la primera serie.
   */
  pesoSugerido(categoria: number): number {
    const p = this.plan();
    if (!p) return 0;
    const pctPorCategoria: Record<number, number> = {
      [CAT.PIERNAS]: 0.4,
      [CAT.ESPALDA]: 0.3,
      [CAT.PECHO]: 0.3,
      [CAT.PANTORRILLAS]: 0.3,
      [CAT.HOMBROS]: 0.15,
      [CAT.BRAZOS]: 0.1,
      [CAT.ABS]: 0,
      [CAT.CARDIO]: 0,
    };
    const escala = { principiante: 0.6, intermedio: 1, avanzado: 1.3 }[p.anamnesis.experiencia];
    const bruto = (pctPorCategoria[categoria] ?? 0.15) * p.anamnesis.pesoKg * escala;
    return Math.round(bruto / 2.5) * 2.5;
  }

  /** Ajusta y persiste el descanso de un ejercicio (configurable desde el reproductor). */
  actualizarDescanso(diaIdx: number, ejIdx: number, descansoSeg: number): void {
    const p = this.plan();
    if (!p?.dias[diaIdx]?.ejercicios[ejIdx]) return;
    const dias = p.dias.map((d, di) =>
      di !== diaIdx
        ? d
        : { ...d, ejercicios: d.ejercicios.map((e, ei) => (ei !== ejIdx ? e : { ...e, descansoSeg })) },
    );
    const actualizado: Plan = { ...p, dias };
    localStorage.setItem(this.clave(), JSON.stringify(actualizado));
    this.plan.set(actualizado);
  }

  /** Reemplaza un ejercicio del plan conservando series/reps/descanso, y persiste. */
  reemplazar(diaIdx: number, ejIdx: number, nuevo: EjercicioCatalogo): void {
    const p = this.plan();
    if (!p) return;
    const actual = p.dias[diaIdx]?.ejercicios[ejIdx];
    if (!actual) return;
    const dias = p.dias.map((d, di) =>
      di !== diaIdx
        ? d
        : {
            ...d,
            ejercicios: d.ejercicios.map((e, ei) =>
              ei !== ejIdx
                ? e
                : { ...e, wgerId: nuevo.id, nombre: nuevo.nombre, imagen: nuevo.imagen, video: nuevo.video },
            ),
          },
    );
    const actualizado: Plan = { ...p, dias };
    localStorage.setItem(this.clave(), JSON.stringify(actualizado));
    this.plan.set(actualizado);
  }

  private calcularDieta(a: Anamnesis): Dieta {
    // BMR: Mifflin-St Jeor [6]
    const s = a.sexo === 'masculino' ? 5 : -161;
    const bmr = Math.round(10 * a.pesoKg + 6.25 * a.tallaCm - 5 * a.edad + s);
    const factor = { 2: 1.375, 3: 1.465, 4: 1.55, 5: 1.725 }[a.diasSemana];
    const tdee = Math.round(bmr * factor);

    // Ritmo elegido → % de cambio de peso corporal por semana.
    // Pérdida: 0.25-0.75 %/sem (lento conserva masa magra [9]; >1 %/sem no se ofrece).
    // Ganancia: la tasa realista de músculo la limita la experiencia, no las ganas —
    // superávit 5-15 % [10] y expectativa honesta por nivel.
    const ritmo = a.ritmo ?? 'constante';
    let kcal: number;
    let cambioSemanalKg: number | null = null;

    if (a.objetivo === 'perdida_grasa') {
      const pctSemana = { relajado: 0.0025, constante: 0.005, decidido: 0.0075 }[ritmo];
      cambioSemanalKg = -+(a.pesoKg * pctSemana).toFixed(2);
      // 1 kg de tejido adiposo ≈ 7,700 kcal
      const deficitDiario = Math.round((Math.abs(cambioSemanalKg) * 7700) / 7);
      kcal = tdee - Math.min(deficitDiario, Math.round(tdee * 0.25)); // tope de seguridad 25 % TDEE
    } else if (a.objetivo === 'hipertrofia') {
      const superavit = { relajado: 0.05, constante: 0.1, decidido: 0.15 }[ritmo];
      kcal = Math.round(tdee * (1 + superavit));
      // Ganancia muscular realista por nivel (aprox. Helms/Iraki): kg por semana
      cambioSemanalKg = { principiante: 0.17, intermedio: 0.09, avanzado: 0.05 }[a.experiencia];
    } else {
      kcal = tdee;
    }

    const piso = a.sexo === 'masculino' ? 1500 : 1200;
    kcal = Math.max(Math.round(kcal), piso);

    // Curva realista semana a semana [13][14][15] — no una línea recta
    let semanasEstimadas: number | null = null;
    let proyeccion: { s: number; p: number }[] | undefined;
    if (a.pesoObjetivoKg && cambioSemanalKg) {
      const sim = this.simularProyeccion(a, kcal, factor, cambioSemanalKg);
      proyeccion = sim.curva;
      semanasEstimadas = sim.semanasMeta;
    }

    // Proteína: 1.6-2.2 g/kg [7]; en déficit 2.3 g/kg [8]
    const proteinaPorKg = { hipertrofia: 1.8, perdida_grasa: 2.3, acondicionamiento: 1.6 }[a.objetivo];
    const proteinaG = Math.round(proteinaPorKg * a.pesoKg);

    // Grasa: 0.8 g/kg, nunca <20 % de las kcal [10]
    let grasaG = Math.round(0.8 * a.pesoKg);
    grasaG = Math.max(grasaG, Math.round((kcal * 0.2) / 9));

    const carbohidratosG = Math.max(0, Math.round((kcal - proteinaG * 4 - grasaG * 9) / 4));
    const comidas = 4; // distribución de proteína ~0.4 g/kg por comida [11]

    // Día de gym vs día de descanso [17]: la sesión cuesta ~4.5 MET × peso × horas.
    // El promedio semanal se conserva: R = promedio − costo·d/7 ; E = R + costo.
    const horasSesion = { '30_45': 0.62, '45_60': 0.87, '60_90': 1.25 }[a.duracionSesion ?? '45_60'];
    const costoSesionKcal = Math.round(4.5 * a.pesoKg * horasSesion);
    let kcalDescanso = Math.round(kcal - (costoSesionKcal * a.diasSemana) / 7);
    kcalDescanso = Math.max(kcalDescanso, piso);
    const kcalEntrenamiento = kcalDescanso + costoSesionKcal;

    return {
      bmr,
      tdee,
      kcalObjetivo: kcal,
      kcalEntrenamiento,
      kcalDescanso,
      costoSesionKcal,
      proteinaG,
      grasaG,
      carbohidratosG,
      pesoObjetivoKg: a.pesoObjetivoKg,
      cambioSemanalKg,
      semanasEstimadas,
      proyeccion,
      nota:
        `Reparte la proteína en ~${comidas} comidas (${Math.round(proteinaG / comidas)} g c/u). ` +
        'Orientación general basada en evidencia (ver Referencias) — no sustituye a un profesional de la nutrición.',
    };
  }
}
