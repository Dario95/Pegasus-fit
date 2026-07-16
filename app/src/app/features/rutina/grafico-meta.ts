import { Component, computed, input, signal } from '@angular/core';
import { RegistroPeso } from '../../core/historial.service';
import { Dieta } from '../../core/models';

interface Punto {
  x: number;
  y: number;
  semana: number;
  peso: number;
  fecha: Date;
}

/**
 * Proyección de peso hacia la meta — el motivador central del plan.
 * Una sola serie (sin leyenda; el título la nombra). Serie #ea580c validada
 * contra la superficie oscura (banda de luminosidad, contraste ≥3:1).
 * La línea es discontinua a propósito: es una estimación, no un registro.
 */
@Component({
  selector: 'app-grafico-meta',
  templateUrl: './grafico-meta.html',
  styleUrl: './grafico-meta.scss',
})
export class GraficoMeta {
  readonly pesoInicial = input.required<number>();
  readonly dieta = input.required<Dieta>();
  /** Pesajes reales del usuario: se dibujan como puntos plata sobre la proyección. */
  readonly registros = input<RegistroPeso[]>([]);
  readonly planInicio = input<string>('');

  // Geometría del lienzo (viewBox)
  readonly W = 340;
  readonly H = 150;
  readonly margen = { izq: 40, der: 16, arr: 18, aba: 26 };

  readonly tooltip = signal<Punto | null>(null);

  /** true si la simulación llega a la meta; false = la curva plachea antes. */
  readonly llegaMeta = computed(() => this.dieta().semanasEstimadas !== null);

  readonly puntos = computed<Punto[]>(() => {
    const d = this.dieta();
    if (!d.pesoObjetivoKg) return [];
    const hoy = new Date();
    // Curva simulada (modelo no lineal); fallback lineal para planes antiguos
    let crudos: { s: number; p: number }[];
    if (d.proyeccion && d.proyeccion.length > 1) {
      crudos = d.proyeccion;
    } else if (d.cambioSemanalKg && d.semanasEstimadas) {
      crudos = Array.from({ length: d.semanasEstimadas + 1 }, (_, s) => ({
        s,
        p: s === d.semanasEstimadas ? d.pesoObjetivoKg! : +(this.pesoInicial() + d.cambioSemanalKg! * s).toFixed(1),
      }));
    } else {
      return [];
    }
    const pts: Punto[] = crudos.map((c) => ({
      semana: c.s,
      peso: c.p,
      fecha: new Date(hoy.getTime() + c.s * 7 * 86400_000),
      x: 0,
      y: 0,
    }));
    // Escalas
    const semanas = pts[pts.length - 1].semana || 1;
    const xs = (s: number) => this.margen.izq + (s / semanas) * (this.W - this.margen.izq - this.margen.der);
    const pesos = pts.map((p) => p.peso);
    const min = Math.min(...pesos) - 1;
    const max = Math.max(...pesos) + 1;
    const ys = (p: number) => this.margen.arr + (1 - (p - min) / (max - min)) * (this.H - this.margen.arr - this.margen.aba);
    return pts.map((p) => ({ ...p, x: xs(p.semana), y: ys(p.peso) }));
  });

  readonly puntosReales = computed(() => {
    const pts = this.puntos();
    const regs = this.registros();
    const inicio = this.planInicio();
    if (pts.length < 2 || !regs.length || !inicio) return [];
    const T = pts[pts.length - 1].semana || 1;
    const pesos = pts.map((p) => p.peso);
    const min = Math.min(...pesos) - 1;
    const max = Math.max(...pesos) + 1;
    const t0 = new Date(inicio).getTime();
    return regs
      .map((r) => {
        const sem = (new Date(r.fecha + 'T12:00').getTime() - t0) / (7 * 86400_000);
        if (sem < -0.3 || sem > T + 0.3) return null;
        const s = Math.max(0, Math.min(T, sem));
        const x = this.margen.izq + (s / T) * (this.W - this.margen.izq - this.margen.der);
        const pesoAcotado = Math.min(max, Math.max(min, r.pesoKg));
        const y = this.margen.arr + (1 - (pesoAcotado - min) / (max - min)) * (this.H - this.margen.arr - this.margen.aba);
        return { x, y, peso: r.pesoKg };
      })
      .filter((p): p is { x: number; y: number; peso: number } => p !== null);
  });

  readonly linea = computed(() =>
    this.puntos()
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' '),
  );

  readonly area = computed(() => {
    const pts = this.puntos();
    if (!pts.length) return '';
    const base = this.H - this.margen.aba;
    return `${this.linea()} L${pts[pts.length - 1].x.toFixed(1)},${base} L${pts[0].x.toFixed(1)},${base} Z`;
  });

  readonly fechaMeta = computed(() => {
    const pts = this.puntos();
    if (!pts.length) return '';
    return this.formatoLargo(pts[pts.length - 1].fecha);
  });

  readonly gridY = computed(() => {
    const pts = this.puntos();
    if (!pts.length) return [];
    const ys = [pts[0], pts[Math.floor(pts.length / 2)], pts[pts.length - 1]];
    return ys.map((p) => ({ y: p.y, etiqueta: `${Math.round(p.peso)}` }));
  });

  formatoCorto(f: Date): string {
    return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(f);
  }

  formatoLargo(f: Date): string {
    return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long', year: 'numeric' }).format(f);
  }

  mover(ev: PointerEvent): void {
    const pts = this.puntos();
    if (!pts.length) return;
    const svg = ev.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * this.W;
    let cercano = pts[0];
    for (const p of pts) if (Math.abs(p.x - x) < Math.abs(cercano.x - x)) cercano = p;
    this.tooltip.set(cercano);
  }

  salirPuntero(): void {
    this.tooltip.set(null);
  }
}
