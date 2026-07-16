import { Injectable, inject, signal } from '@angular/core';
import { Anamnesis, DiaPlan, Dieta, EjercicioPlan, Plan } from './models';
import { CAT, EjercicioCatalogo, WgerService } from './wger.service';

/**
 * Motor de plan del MVP. Vive en la app por ahora; la spec (§3.3, §4) lo ubica
 * en el BFF como servicio — migrarlo ahí en fase 2 sin cambiar el contrato.
 */

const STORAGE_KEY = 'pegasus.plan';

/** Cuota de ejercicios por categoría para cada día según frecuencia (spec §1.2b). */
const PLANTILLAS: Record<number, { nombre: string; cuotas: [number, number][] }[]> = {
  2: [
    { nombre: 'Full Body A', cuotas: [[CAT.PECHO, 1], [CAT.ESPALDA, 1], [CAT.PIERNAS, 2], [CAT.HOMBROS, 1], [CAT.ABS, 1]] },
    { nombre: 'Full Body B', cuotas: [[CAT.PECHO, 1], [CAT.ESPALDA, 2], [CAT.PIERNAS, 1], [CAT.BRAZOS, 1], [CAT.ABS, 1]] },
  ],
  3: [
    { nombre: 'Empuje', cuotas: [[CAT.PECHO, 2], [CAT.HOMBROS, 2], [CAT.BRAZOS, 1], [CAT.ABS, 1]] },
    { nombre: 'Tirón', cuotas: [[CAT.ESPALDA, 3], [CAT.BRAZOS, 2], [CAT.ABS, 1]] },
    { nombre: 'Pierna', cuotas: [[CAT.PIERNAS, 4], [CAT.PANTORRILLAS, 1], [CAT.ABS, 1]] },
  ],
  4: [
    { nombre: 'Tren Superior A', cuotas: [[CAT.PECHO, 2], [CAT.ESPALDA, 2], [CAT.HOMBROS, 1], [CAT.BRAZOS, 1]] },
    { nombre: 'Tren Inferior A', cuotas: [[CAT.PIERNAS, 4], [CAT.PANTORRILLAS, 1], [CAT.ABS, 1]] },
    { nombre: 'Tren Superior B', cuotas: [[CAT.PECHO, 2], [CAT.ESPALDA, 2], [CAT.HOMBROS, 1], [CAT.BRAZOS, 1]] },
    { nombre: 'Tren Inferior B', cuotas: [[CAT.PIERNAS, 3], [CAT.PANTORRILLAS, 1], [CAT.ABS, 2]] },
  ],
  5: [
    { nombre: 'Empuje', cuotas: [[CAT.PECHO, 2], [CAT.HOMBROS, 2], [CAT.BRAZOS, 1]] },
    { nombre: 'Tirón', cuotas: [[CAT.ESPALDA, 3], [CAT.BRAZOS, 2]] },
    { nombre: 'Pierna', cuotas: [[CAT.PIERNAS, 4], [CAT.PANTORRILLAS, 1]] },
    { nombre: 'Tren Superior', cuotas: [[CAT.PECHO, 1], [CAT.ESPALDA, 1], [CAT.HOMBROS, 1], [CAT.BRAZOS, 1], [CAT.ABS, 1]] },
    { nombre: 'Tren Inferior', cuotas: [[CAT.PIERNAS, 3], [CAT.PANTORRILLAS, 1], [CAT.ABS, 1]] },
  ],
};

const ESQUEMA_SERIES = {
  principiante: { series: 3, reps: '8–12', descansoSeg: 90 },
  intermedio: { series: 4, reps: '8–12', descansoSeg: 90 },
  avanzado: { series: 4, reps: '6–10', descansoSeg: 120 },
} as const;

@Injectable({ providedIn: 'root' })
export class PlanService {
  private wger = inject(WgerService);

  readonly plan = signal<Plan | null>(this.cargar());

  private cargar(): Plan | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Plan) : null;
    } catch {
      return null;
    }
  }

  limpiar(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.plan.set(null);
  }

  async generar(anamnesis: Anamnesis): Promise<Plan> {
    const dias = await this.generarRutina(anamnesis);
    const dieta = this.calcularDieta(anamnesis);
    const plan: Plan = { anamnesis, dias, dieta, generado: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    this.plan.set(plan);
    return plan;
  }

  private async generarRutina(a: Anamnesis): Promise<DiaPlan[]> {
    const plantilla = PLANTILLAS[a.diasSemana];
    const esquema = ESQUEMA_SERIES[a.experiencia];
    const usados = new Set<number>();
    const dias: DiaPlan[] = [];

    for (const dia of plantilla) {
      const ejercicios: EjercicioPlan[] = [];
      for (const [categoria, cantidad] of dia.cuotas) {
        const catalogo = await this.wger.porCategoria(categoria);
        for (const ej of this.elegir(catalogo, cantidad, usados)) {
          ejercicios.push({
            wgerId: ej.id,
            nombre: ej.nombre,
            imagen: ej.imagen,
            video: ej.video,
            ...esquema,
          });
        }
      }
      dias.push({ nombre: dia.nombre, ejercicios });
    }
    return dias;
  }

  /** Elige n ejercicios no repetidos en el plan, al azar para variar entre generaciones. */
  private elegir(catalogo: EjercicioCatalogo[], n: number, usados: Set<number>): EjercicioCatalogo[] {
    const disponibles = catalogo.filter((e) => !usados.has(e.id));
    const barajados = [...disponibles].sort(() => Math.random() - 0.5);
    const elegidos = barajados.slice(0, n);
    elegidos.forEach((e) => usados.add(e.id));
    return elegidos;
  }

  /** Estándares: Mifflin-St Jeor + multiplicador TDEE + macros ISSN (spec §4). */
  private calcularDieta(a: Anamnesis): Dieta {
    const s = a.sexo === 'masculino' ? 5 : -161;
    const bmr = Math.round(10 * a.pesoKg + 6.25 * a.tallaCm - 5 * a.edad + s);
    const factor = { 2: 1.375, 3: 1.465, 4: 1.55, 5: 1.725 }[a.diasSemana];
    const tdee = Math.round(bmr * factor);

    const ajuste = { hipertrofia: 1.12, perdida_grasa: 0.83, acondicionamiento: 1.0 }[a.objetivo];
    let kcal = Math.round(tdee * ajuste);
    // Piso de seguridad sin supervisión profesional (spec §4.2)
    const piso = a.sexo === 'masculino' ? 1500 : 1200;
    kcal = Math.max(kcal, piso);

    const proteinaG = Math.round((a.objetivo === 'perdida_grasa' ? 2.2 : 1.8) * a.pesoKg);
    const grasaG = Math.round(0.9 * a.pesoKg);
    const carbohidratosG = Math.max(0, Math.round((kcal - proteinaG * 4 - grasaG * 9) / 4));

    return {
      bmr,
      tdee,
      kcalObjetivo: kcal,
      proteinaG,
      grasaG,
      carbohidratosG,
      nota: 'Orientación general, no prescripción. Ante condiciones médicas o dudas, consulta a un profesional de la nutrición.',
    };
  }
}
