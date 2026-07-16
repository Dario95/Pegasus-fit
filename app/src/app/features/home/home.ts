import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AsistenciaService } from '../../core/asistencia.service';
import { AuthService } from '../../core/auth.service';
import { HistorialService } from '../../core/historial.service';
import { Icono } from '../../core/icono';
import { PlanService } from '../../core/plan.service';

@Component({
  selector: 'app-home',
  imports: [RouterLink, FormsModule, Icono],
  templateUrl: './home.html',
})
export class Home {
  readonly auth = inject(AuthService);
  readonly asistencia = inject(AsistenciaService);
  readonly historial = inject(HistorialService);
  private planService = inject(PlanService);

  readonly plan = this.planService.plan;
  readonly pesoNuevo = signal<number | null>(null);
  readonly pesoGuardado = signal(false);

  readonly proximoDia = computed(() => {
    const p = this.plan();
    if (!p) return null;
    const idx = this.historial.proximoDiaIdx(p.dias.length);
    return { idx, ...p.dias[idx] };
  });

  readonly saludo = computed(() => {
    const h = new Date().getHours();
    const momento = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
    const u = this.auth.usuario();
    return u ? `${momento}, ${u.username}` : momento;
  });

  readonly progresoMeta = computed(() => {
    const p = this.plan();
    const ultimo = this.historial.ultimoPeso();
    if (!p?.dieta.pesoObjetivoKg || !ultimo) return null;
    const inicio = p.anamnesis.pesoKg;
    const meta = p.dieta.pesoObjetivoKg;
    const avance = Math.min(1, Math.max(0, (inicio - ultimo.pesoKg) / (inicio - meta)));
    return { actual: ultimo.pesoKg, meta, pct: Math.round(avance * 100) };
  });

  guardarPeso(): void {
    const p = this.pesoNuevo();
    if (!p || p < 30 || p > 300) return;
    this.historial.registrarPeso(p);
    this.pesoNuevo.set(null);
    this.pesoGuardado.set(true);
    setTimeout(() => this.pesoGuardado.set(false), 2500);
  }
}
