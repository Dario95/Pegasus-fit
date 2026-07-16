import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icono } from '../../core/icono';
import { EjercicioPlan } from '../../core/models';
import { PlanService } from '../../core/plan.service';
import { EjercicioCatalogo } from '../../core/wger.service';
import { GraficoMeta } from './grafico-meta';

@Component({
  selector: 'app-rutina',
  imports: [RouterLink, Icono, GraficoMeta],
  templateUrl: './rutina.html',
  styleUrl: './rutina.scss',
})
export class Rutina {
  private planService = inject(PlanService);

  readonly plan = this.planService.plan;
  readonly diaAbierto = signal(0);

  // Estado del panel "cambiar ejercicio" (máquina ocupada / no me gusta)
  readonly cambiando = signal<{ diaIdx: number; ejIdx: number; ej: EjercicioPlan } | null>(null);
  readonly alternativas = signal<EjercicioCatalogo[]>([]);
  readonly cargandoAlternativas = signal(false);

  /** Momento de celebración: el plan se generó hace menos de 2 minutos. */
  readonly esNuevo = computed(() => {
    const p = this.plan();
    return !!p && Date.now() - new Date(p.generado).getTime() < 120_000;
  });

  readonly etiquetaObjetivo: Record<string, string> = {
    hipertrofia: 'Ganar músculo',
    perdida_grasa: 'Perder grasa',
    acondicionamiento: 'Acondicionamiento',
  };

  toggleDia(i: number): void {
    this.diaAbierto.update((actual) => (actual === i ? -1 : i));
  }

  async abrirCambio(diaIdx: number, ejIdx: number, ej: EjercicioPlan): Promise<void> {
    this.cambiando.set({ diaIdx, ejIdx, ej });
    this.alternativas.set([]);
    this.cargandoAlternativas.set(true);
    try {
      this.alternativas.set(await this.planService.alternativas(ej));
    } finally {
      this.cargandoAlternativas.set(false);
    }
  }

  cerrarCambio(): void {
    this.cambiando.set(null);
  }

  elegirAlternativa(alt: EjercicioCatalogo): void {
    const ctx = this.cambiando();
    if (!ctx) return;
    this.planService.reemplazar(ctx.diaIdx, ctx.ejIdx, alt);
    this.cambiando.set(null);
  }

  async otrasOpciones(): Promise<void> {
    const ctx = this.cambiando();
    if (!ctx) return;
    this.cargandoAlternativas.set(true);
    try {
      this.alternativas.set(await this.planService.alternativas(ctx.ej));
    } finally {
      this.cargandoAlternativas.set(false);
    }
  }

  regenerar(): void {
    if (confirm('¿Borrar el plan actual y hacer la evaluación de nuevo?')) {
      this.planService.limpiar();
    }
  }
}
