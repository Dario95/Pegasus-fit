import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Icono } from '../../core/icono';
import { PlanService } from '../../core/plan.service';
import { GraficoMeta } from '../rutina/grafico-meta';

interface Comida {
  nombre: string;
  hora: string;
  pct: number;
  ejemplos: string;
}

/** Distribución estándar de 4 comidas; proteína repartida ~uniforme (Schoenfeld & Aragon 2018). */
const COMIDAS: Comida[] = [
  { nombre: 'Desayuno', hora: '7–9 am', pct: 0.25, ejemplos: 'Huevos, avena, fruta, yogur griego' },
  { nombre: 'Almuerzo', hora: '12–2 pm', pct: 0.35, ejemplos: 'Pollo o pescado, arroz, ensalada, aguacate' },
  { nombre: 'Merienda', hora: '4–5 pm', pct: 0.15, ejemplos: 'Batido de proteína, maní, guineo' },
  { nombre: 'Cena', hora: '7–9 pm', pct: 0.25, ejemplos: 'Carne magra, papa o verde, vegetales' },
];

@Component({
  selector: 'app-dieta',
  imports: [RouterLink, FormsModule, Icono, GraficoMeta],
  templateUrl: './dieta.html',
})
export class DietaPagina {
  private planService = inject(PlanService);
  private http = inject(HttpClient);

  readonly plan = this.planService.plan;

  // Recetas con IA (vía BFF — la API key vive en el servidor)
  readonly alimentos = signal('');
  readonly recetas = signal<string | null>(null);
  readonly generandoRecetas = signal(false);
  readonly errorRecetas = signal<string | null>(null);

  readonly comidas = computed(() => {
    const p = this.plan();
    if (!p) return [];
    const d = p.dieta;
    return COMIDAS.map((c) => ({
      ...c,
      kcal: Math.round(d.kcalEntrenamiento * c.pct),
      proteina: Math.round(d.proteinaG / COMIDAS.length),
      carbos: Math.round(d.carbohidratosG * c.pct),
      grasa: Math.round(d.grasaG * c.pct),
    }));
  });

  async sugerirRecetas(): Promise<void> {
    const p = this.plan();
    if (!p || this.generandoRecetas()) return;
    this.generandoRecetas.set(true);
    this.errorRecetas.set(null);
    this.recetas.set(null);
    try {
      const r = await firstValueFrom(
        this.http.post<{ menu: string }>(`${environment.bffApiUrl}/recetas`, {
          alimentos: this.alimentos().trim(),
          kcalEntrenamiento: p.dieta.kcalEntrenamiento,
          kcalDescanso: p.dieta.kcalDescanso,
          proteinaG: p.dieta.proteinaG,
          diasGym: p.anamnesis.diasSemana,
          objetivo: p.anamnesis.objetivo,
        }),
      );
      this.recetas.set(r.menu);
    } catch {
      this.errorRecetas.set(
        'No se pudo generar el menú. Verifica que el BFF esté corriendo (cd bff && npm run start:dev).',
      );
    } finally {
      this.generandoRecetas.set(false);
    }
  }
}
