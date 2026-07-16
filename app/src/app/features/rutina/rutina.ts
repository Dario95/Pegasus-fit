import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icono } from '../../core/icono';
import { PlanService } from '../../core/plan.service';

@Component({
  selector: 'app-rutina',
  imports: [RouterLink, Icono],
  templateUrl: './rutina.html',
  styleUrl: './rutina.scss',
})
export class Rutina {
  private planService = inject(PlanService);

  readonly plan = this.planService.plan;
  readonly diaAbierto = signal(0);

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

  regenerar(): void {
    if (confirm('¿Borrar el plan actual y hacer la evaluación de nuevo?')) {
      this.planService.limpiar();
    }
  }
}
