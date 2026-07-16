import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { PlanService } from './plan.service';

const STORAGE_KEY = 'pegasus.asistencia';

function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Lunes de la semana que contiene la fecha dada. */
function lunesDe(fecha: Date): Date {
  const d = new Date(fecha);
  const dia = (d.getDay() + 6) % 7; // 0 = lunes
  d.setDate(d.getDate() - dia);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Registro de asistencia al gym: días marcados como entrenados, progreso de la
 * semana y racha de semanas cumpliendo la frecuencia del plan.
 */
@Injectable({ providedIn: 'root' })
export class AsistenciaService {
  private auth = inject(AuthService);
  private planService = inject(PlanService);

  readonly fechas = signal<string[]>([]);

  constructor() {
    effect(() => {
      this.auth.usuario(); // recargar al cambiar la sesión
      this.fechas.set(this.cargar());
    });
  }

  private clave(): string {
    const u = this.auth.usuario();
    return u ? `${STORAGE_KEY}::${u.id}` : STORAGE_KEY;
  }

  private cargar(): string[] {
    try {
      return JSON.parse(localStorage.getItem(this.clave()) ?? '[]');
    } catch {
      return [];
    }
  }

  readonly entrenoHoy = computed(() => this.fechas().includes(hoyISO()));

  /** Marca o desmarca la sesión de hoy. */
  toggleHoy(): void {
    const hoy = hoyISO();
    const nuevas = this.entrenoHoy()
      ? this.fechas().filter((f) => f !== hoy)
      : [...this.fechas(), hoy].sort();
    localStorage.setItem(this.clave(), JSON.stringify(nuevas));
    this.fechas.set(nuevas);
  }

  /** Últimos 7 días (de hace 6 días a hoy) con su estado. */
  readonly ultimos7 = computed(() => {
    const set = new Set(this.fechas());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return {
        etiqueta: ['D', 'L', 'M', 'X', 'J', 'V', 'S'][d.getDay()],
        entrenado: set.has(iso),
        esHoy: i === 6,
      };
    });
  });

  /** Sesiones de la semana actual (lunes a domingo). */
  readonly sesionesSemana = computed(() => {
    const inicio = lunesDe(new Date());
    return this.fechas().filter((f) => {
      const d = new Date(f + 'T12:00');
      return d >= inicio;
    }).length;
  });

  readonly objetivoSemanal = computed(() => this.planService.plan()?.anamnesis.diasSemana ?? 0);

  /**
   * Racha: semanas consecutivas (hacia atrás, sin contar la actual)
   * cumpliendo la frecuencia del plan. La semana en curso suma cuando llega
   * a la meta — así la racha nunca "castiga" a mitad de semana.
   */
  readonly rachaSemanas = computed(() => {
    const objetivo = this.objetivoSemanal();
    if (!objetivo) return 0;
    const fechas = this.fechas();
    const porSemana = new Map<number, number>();
    for (const f of fechas) {
      const clave = lunesDe(new Date(f + 'T12:00')).getTime();
      porSemana.set(clave, (porSemana.get(clave) ?? 0) + 1);
    }
    const estaSemana = lunesDe(new Date()).getTime();
    let racha = (porSemana.get(estaSemana) ?? 0) >= objetivo ? 1 : 0;
    for (let i = 1; i <= 260; i++) {
      const semana = estaSemana - i * 7 * 86400_000;
      if ((porSemana.get(semana) ?? 0) >= objetivo) racha++;
      else break;
    }
    return racha;
  });
}
