import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

export interface SerieHecha {
  reps: number;
  pesoKg: number;
}

export interface EjercicioHecho {
  wgerId: number;
  nombre: string;
  series: SerieHecha[];
}

export interface Sesion {
  fecha: string; // ISO
  diaIdx: number;
  diaNombre: string;
  duracionSeg: number;
  ejercicios: EjercicioHecho[];
}

export interface RegistroPeso {
  fecha: string; // ISO date
  pesoKg: number;
}

const KEY_SESIONES = 'pegasus.historial';
const KEY_PESOS = 'pegasus.pesos';

/** Historial de sesiones completadas y pesajes corporales (por usuario). */
@Injectable({ providedIn: 'root' })
export class HistorialService {
  private auth = inject(AuthService);

  readonly sesiones = signal<Sesion[]>([]);
  readonly pesos = signal<RegistroPeso[]>([]);

  constructor() {
    effect(() => {
      this.auth.usuario();
      this.sesiones.set(this.leer(KEY_SESIONES));
      this.pesos.set(this.leer(KEY_PESOS));
    });
  }

  private clave(base: string): string {
    const u = this.auth.usuario();
    return u ? `${base}::${u.id}` : base;
  }

  private leer<T>(base: string): T[] {
    try {
      return JSON.parse(localStorage.getItem(this.clave(base)) ?? '[]');
    } catch {
      return [];
    }
  }

  guardarSesion(sesion: Sesion): void {
    const nuevas = [...this.sesiones(), sesion];
    localStorage.setItem(this.clave(KEY_SESIONES), JSON.stringify(nuevas));
    this.sesiones.set(nuevas);
  }

  /** Peso usado la última vez en un ejercicio — el punto de partida de hoy. */
  ultimoPesoDe(wgerId: number): number | null {
    const sesiones = this.sesiones();
    for (let i = sesiones.length - 1; i >= 0; i--) {
      const ej = sesiones[i].ejercicios.find((e) => e.wgerId === wgerId);
      const ultimo = ej?.series[ej.series.length - 1];
      if (ultimo) return ultimo.pesoKg;
    }
    return null;
  }

  /** Siguiente día del plan según la última sesión registrada. */
  proximoDiaIdx(totalDias: number): number {
    if (!totalDias) return 0;
    const ultima = this.sesiones()[this.sesiones().length - 1];
    return ultima ? (ultima.diaIdx + 1) % totalDias : 0;
  }

  registrarPeso(pesoKg: number): void {
    const hoy = new Date().toISOString().slice(0, 10);
    const nuevos = [...this.pesos().filter((p) => p.fecha !== hoy), { fecha: hoy, pesoKg }]
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    localStorage.setItem(this.clave(KEY_PESOS), JSON.stringify(nuevos));
    this.pesos.set(nuevos);
  }

  readonly ultimoPeso = computed(() => this.pesos()[this.pesos().length - 1] ?? null);
}
