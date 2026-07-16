import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Icono } from '../../core/icono';
import {
  Anamnesis as AnamnesisModel,
  DuracionSesion,
  Entorno,
  Experiencia,
  Objetivo,
  Ritmo,
  Sexo,
} from '../../core/models';
import { PlanService } from '../../core/plan.service';

/** Cribado de seguridad basado en PAR-Q+ (spec §1.2d): cualquier "sí" deriva a sala. */
const PREGUNTAS_SALUD: { id: string; texto: string }[] = [
  { id: 'cardiaco', texto: '¿Alguna vez un médico te ha dicho que tienes una condición cardíaca?' },
  { id: 'dolor_pecho', texto: '¿Sientes dolor en el pecho al hacer actividad física?' },
  { id: 'mareos', texto: '¿Has perdido el equilibrio por mareos o has perdido el conocimiento en el último año?' },
  { id: 'articular', texto: '¿Tienes dolores agudos articulares, de espalda o una hernia diagnosticada?' },
  { id: 'presion', texto: '¿Tienes hipertensión severa o tomas medicación para la presión?' },
  { id: 'embarazo', texto: '¿Estás embarazada o diste a luz hace menos de 6 meses?' },
  { id: 'otra', texto: '¿Tienes otra condición médica por la que debieras consultar antes de ejercitarte?' },
];

/** Motivaciones: el "porqué" emocional detrás del objetivo. */
const MOTIVACIONES = [
  { id: 'energia', icono: 'bolt', texto: 'Tener más energía' },
  { id: 'confianza', icono: 'destellos', texto: 'Sentirme bien conmigo' },
  { id: 'salud', icono: 'corazon', texto: 'Cuidar mi salud' },
  { id: 'fuerza', icono: 'tendencia', texto: 'Ser más fuerte' },
  { id: 'estres', icono: 'ciencia', texto: 'Manejar el estrés' },
  { id: 'reto', icono: 'trofeo', texto: 'Demostrarme que puedo' },
];

const TOTAL_PASOS = 5;

@Component({
  selector: 'app-anamnesis',
  imports: [FormsModule, Icono],
  templateUrl: './anamnesis.html',
  styleUrl: './anamnesis.scss',
})
export class Anamnesis {
  private planService = inject(PlanService);
  private router = inject(Router);

  readonly preguntas = PREGUNTAS_SALUD;
  readonly listaMotivaciones = MOTIVACIONES;
  readonly totalPasos = TOTAL_PASOS;

  // 0 salud · 1 sobre ti · 2 tu porqué (meta) · 3 tu ritmo · 4 experiencia
  readonly paso = signal(0);
  readonly generando = signal(false);
  readonly error = signal<string | null>(null);

  readonly salud = signal<Record<string, boolean | null>>(
    Object.fromEntries(PREGUNTAS_SALUD.map((p) => [p.id, null])),
  );
  readonly bloqueado = computed(() => Object.values(this.salud()).some((v) => v === true));
  readonly saludCompleta = computed(() => Object.values(this.salud()).every((v) => v !== null));

  readonly sexo = signal<Sexo | null>(null);
  readonly edad = signal<number | null>(null);
  readonly pesoKg = signal<number | null>(null);
  readonly tallaCm = signal<number | null>(null);
  readonly datosCompletos = computed(
    () =>
      this.sexo() !== null &&
      (this.edad() ?? 0) >= 16 && (this.edad() ?? 0) <= 90 &&
      (this.pesoKg() ?? 0) >= 35 && (this.pesoKg() ?? 0) <= 250 &&
      (this.tallaCm() ?? 0) >= 130 && (this.tallaCm() ?? 0) <= 220,
  );

  readonly objetivo = signal<Objetivo | null>(null);
  readonly motivaciones = signal<string[]>([]);
  readonly pesoObjetivoKg = signal<number | null>(null);
  readonly ritmo = signal<Ritmo | null>(null);

  /** La meta numérica solo aplica a hipertrofia/pérdida y debe apuntar en la dirección correcta. */
  readonly conMetaPeso = computed(() => this.objetivo() !== null && this.objetivo() !== 'acondicionamiento');
  readonly metaPesoValida = computed(() => {
    if (!this.conMetaPeso()) return true;
    const actual = this.pesoKg() ?? 0;
    const meta = this.pesoObjetivoKg();
    if (meta === null || meta < 35 || meta > 250 || this.ritmo() === null) return false;
    return this.objetivo() === 'perdida_grasa' ? meta < actual : meta > actual;
  });
  readonly porqueCompleto = computed(() => this.objetivo() !== null && this.metaPesoValida());

  readonly diasSemana = signal<2 | 3 | 4 | 5 | null>(null);
  readonly duracionSesion = signal<DuracionSesion | null>(null);
  readonly entorno = signal<Entorno | null>(null);
  readonly ritmoCompleto = computed(
    () => this.diasSemana() !== null && this.duracionSesion() !== null && this.entorno() !== null,
  );

  readonly experiencia = signal<Experiencia | null>(null);

  responderSalud(id: string, valor: boolean): void {
    this.salud.update((s) => ({ ...s, [id]: valor }));
  }

  reiniciarSalud(): void {
    this.salud.set(Object.fromEntries(PREGUNTAS_SALUD.map((p) => [p.id, null])));
  }

  toggleMotivacion(id: string): void {
    this.motivaciones.update((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  }

  atras(): void {
    this.paso.update((p) => Math.max(0, p - 1));
  }

  continuarSalud(): void {
    if (this.saludCompleta() && !this.bloqueado()) this.paso.set(1);
  }

  async generar(): Promise<void> {
    if (this.experiencia() === null || this.generando()) return;
    this.generando.set(true);
    this.error.set(null);

    const anamnesis: AnamnesisModel = {
      saludRespuestas: Object.fromEntries(
        Object.entries(this.salud()).map(([k, v]) => [k, v === true]),
      ),
      sexo: this.sexo()!,
      edad: this.edad()!,
      pesoKg: this.pesoKg()!,
      tallaCm: this.tallaCm()!,
      objetivo: this.objetivo()!,
      motivaciones: this.motivaciones(),
      pesoObjetivoKg: this.conMetaPeso() ? this.pesoObjetivoKg() : null,
      ritmo: this.conMetaPeso() ? this.ritmo() : null,
      diasSemana: this.diasSemana()!,
      duracionSesion: this.duracionSesion()!,
      entorno: this.entorno()!,
      experiencia: this.experiencia()!,
      fecha: new Date().toISOString(),
    };

    try {
      await this.planService.generar(anamnesis);
      await this.router.navigate(['/rutina']);
    } catch (e) {
      this.error.set('No se pudo generar el plan. Verifica la conexión con el servidor e intenta de nuevo.');
      console.error(e);
    } finally {
      this.generando.set(false);
    }
  }
}
