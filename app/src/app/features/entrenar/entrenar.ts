import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AsistenciaService } from '../../core/asistencia.service';
import { EjercicioHecho, HistorialService } from '../../core/historial.service';
import { Icono } from '../../core/icono';
import { PlanService } from '../../core/plan.service';
import { beepCuenta, beepFin, beepOk } from '../../core/sonido';

type Fase = 'serie' | 'descanso' | 'fin';

/** Reproductor de entrenamiento: pensado para usarse CON las manos ocupadas —
 *  targets enormes, autoavance y sonido en la cuenta regresiva del descanso. */
@Component({
  selector: 'app-entrenar',
  imports: [Icono],
  templateUrl: './entrenar.html',
})
export class Entrenar implements OnDestroy {
  private planService = inject(PlanService);
  private historial = inject(HistorialService);
  private asistencia = inject(AsistenciaService);
  private router = inject(Router);

  readonly plan = this.planService.plan;
  readonly diaIdx = this.historial.proximoDiaIdx(this.plan()?.dias.length ?? 0);
  readonly dia = computed(() => this.plan()?.dias[this.diaIdx] ?? null);

  readonly fase = signal<Fase>('serie');
  readonly ejIdx = signal(0);
  readonly serieIdx = signal(0);
  readonly reps = signal(10);
  readonly pesoKg = signal(0);
  readonly descansoRestante = signal(0);
  readonly sonido = signal(true);

  private hechos: EjercicioHecho[] = [];
  private timer?: ReturnType<typeof setInterval>;
  private inicioSesion = Date.now();

  readonly ejercicio = computed(() => this.dia()?.ejercicios[this.ejIdx()] ?? null);
  readonly totalEjercicios = computed(() => this.dia()?.ejercicios.length ?? 0);
  readonly seriesHechasActual = computed(
    () => this.hechosDe(this.ejercicio()?.wgerId ?? -1)?.series ?? [],
  );
  readonly minutos = computed(() => Math.floor((Date.now() - this.inicioSesion) / 60000));

  readonly resumen = computed(() => {
    const series = this.hechos.reduce((s, e) => s + e.series.length, 0);
    const volumen = this.hechos.reduce(
      (s, e) => s + e.series.reduce((v, x) => v + x.reps * x.pesoKg, 0),
      0,
    );
    return { series, volumen: Math.round(volumen), ejercicios: this.hechos.length };
  });

  constructor() {
    this.prepararSerie();
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  private hechosDe(wgerId: number): EjercicioHecho | undefined {
    return this.hechos.find((e) => e.wgerId === wgerId);
  }

  /** Reps objetivo desde el esquema del plan (ej. "6–12 · RIR 2–3" → 9). */
  private repsObjetivo(): number {
    const m = this.ejercicio()?.reps.match(/(\d+)\s*[–-]\s*(\d+)/);
    return m ? Math.round((+m[1] + +m[2]) / 2) : 10;
  }

  private prepararSerie(): void {
    const ej = this.ejercicio();
    if (!ej) return;
    this.reps.set(this.repsObjetivo());
    const previa = this.seriesHechasActual()[this.seriesHechasActual().length - 1];
    this.pesoKg.set(previa?.pesoKg ?? this.historial.ultimoPesoDe(ej.wgerId) ?? 0);
  }

  ajustarReps(d: number): void {
    this.reps.update((r) => Math.max(1, Math.min(50, r + d)));
  }

  ajustarPeso(d: number): void {
    this.pesoKg.update((p) => Math.max(0, +(p + d).toFixed(1)));
  }

  completarSerie(): void {
    const ej = this.ejercicio();
    if (!ej) return;
    if (this.sonido()) beepOk();
    let registro = this.hechosDe(ej.wgerId);
    if (!registro) {
      registro = { wgerId: ej.wgerId, nombre: ej.nombre, series: [] };
      this.hechos.push(registro);
    }
    registro.series.push({ reps: this.reps(), pesoKg: this.pesoKg() });

    const esUltimaSerie = this.serieIdx() + 1 >= ej.series;
    const esUltimoEjercicio = this.ejIdx() + 1 >= this.totalEjercicios();
    if (esUltimaSerie && esUltimoEjercicio) {
      this.terminar();
      return;
    }
    this.iniciarDescanso(ej.descansoSeg, esUltimaSerie);
  }

  private iniciarDescanso(segundos: number, cambiarEjercicio: boolean): void {
    this.fase.set('descanso');
    this.descansoRestante.set(segundos);
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      const s = this.descansoRestante() - 1;
      this.descansoRestante.set(s);
      if (this.sonido() && s > 0 && s <= 3) beepCuenta();
      if (s <= 0) {
        if (this.sonido()) beepFin();
        this.avanzar(cambiarEjercicio);
      }
    }, 1000);
  }

  saltarDescanso(): void {
    const ej = this.ejercicio();
    const cambia = this.serieIdx() + 1 >= (ej?.series ?? 1);
    this.avanzar(cambia);
  }

  private avanzar(cambiarEjercicio: boolean): void {
    clearInterval(this.timer);
    if (cambiarEjercicio) {
      this.ejIdx.update((i) => i + 1);
      this.serieIdx.set(0);
    } else {
      this.serieIdx.update((i) => i + 1);
    }
    this.prepararSerie();
    this.fase.set('serie');
  }

  saltarEjercicio(): void {
    if (this.ejIdx() + 1 >= this.totalEjercicios()) {
      this.terminar();
      return;
    }
    clearInterval(this.timer);
    this.ejIdx.update((i) => i + 1);
    this.serieIdx.set(0);
    this.prepararSerie();
    this.fase.set('serie');
  }

  private terminar(): void {
    clearInterval(this.timer);
    this.fase.set('fin');
  }

  guardarYSalir(): void {
    const dia = this.dia();
    if (dia && this.hechos.length) {
      this.historial.guardarSesion({
        fecha: new Date().toISOString(),
        diaIdx: this.diaIdx,
        diaNombre: dia.nombre,
        duracionSeg: Math.round((Date.now() - this.inicioSesion) / 1000),
        ejercicios: this.hechos,
      });
      if (!this.asistencia.entrenoHoy()) this.asistencia.toggleHoy();
    }
    void this.router.navigate(['/home']);
  }

  salir(): void {
    if (!this.hechos.length || confirm('¿Salir del entrenamiento? Se guardará lo completado.')) {
      this.guardarYSalir();
    }
  }
}
