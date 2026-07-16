import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Icono } from '../../core/icono';
import { PlanService } from '../../core/plan.service';

@Component({
  selector: 'app-perfil',
  imports: [RouterLink, Icono],
  templateUrl: './perfil.html',
})
export class Perfil {
  readonly auth = inject(AuthService);
  private planService = inject(PlanService);
  private router = inject(Router);

  readonly plan = this.planService.plan;

  readonly etiquetaObjetivo: Record<string, string> = {
    hipertrofia: 'Ganar músculo',
    perdida_grasa: 'Perder grasa',
    acondicionamiento: 'Acondicionamiento',
  };

  fecha(iso: string): string {
    return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long' }).format(new Date(iso));
  }

  async repetirEvaluacion(): Promise<void> {
    if (confirm('Repetir la evaluación genera un plan nuevo que reemplaza al actual. ¿Continuamos?')) {
      await this.router.navigate(['/anamnesis']);
    }
  }

  salir(): void {
    this.auth.salir();
  }
}
