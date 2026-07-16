import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
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
  imports: [RouterLink, Icono, GraficoMeta],
  templateUrl: './dieta.html',
})
export class DietaPagina {
  private planService = inject(PlanService);
  readonly plan = this.planService.plan;

  readonly comidas = computed(() => {
    const p = this.plan();
    if (!p) return [];
    const d = p.dieta;
    return COMIDAS.map((c) => ({
      ...c,
      kcal: Math.round(d.kcalObjetivo * c.pct),
      proteina: Math.round(d.proteinaG / COMIDAS.length),
      carbos: Math.round(d.carbohidratosG * c.pct),
      grasa: Math.round(d.grasaG * c.pct),
    }));
  });
}
