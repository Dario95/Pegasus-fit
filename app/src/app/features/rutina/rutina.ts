import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlanService } from '../../core/plan.service';

@Component({
  selector: 'app-rutina',
  imports: [RouterLink],
  templateUrl: './rutina.html',
  styleUrl: './rutina.scss',
})
export class Rutina {
  private planService = inject(PlanService);

  readonly plan = this.planService.plan;
  readonly diaAbierto = signal(0);

  readonly etiquetaObjetivo: Record<string, string> = {
    hipertrofia: '💪 Ganar músculo',
    perdida_grasa: '🔥 Perder grasa',
    acondicionamiento: '🫀 Acondicionamiento',
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
