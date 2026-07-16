export type Objetivo = 'hipertrofia' | 'perdida_grasa' | 'acondicionamiento';
export type Experiencia = 'principiante' | 'intermedio' | 'avanzado';
export type Sexo = 'masculino' | 'femenino';
export type DuracionSesion = '30_45' | '45_60' | '60_90';
export type Entorno = 'gimnasio' | 'casa';
export type Ritmo = 'relajado' | 'constante' | 'decidido';

export interface Anamnesis {
  // Filtro de seguridad (regla de oro: cualquier "sí" bloquea la generación)
  saludRespuestas: Record<string, boolean>;
  // Datos corporales
  sexo: Sexo;
  edad: number;
  pesoKg: number;
  tallaCm: number;
  // Metas y preferencias (el "porqué" y el "cómo" del usuario)
  objetivo: Objetivo;
  motivaciones: string[]; // qué lo mueve: energía, confianza, salud…
  pesoObjetivoKg: number | null; // null para acondicionamiento
  ritmo: Ritmo | null; // qué tan rápido quiere llegar (define déficit/superávit)
  diasSemana: 2 | 3 | 4 | 5;
  duracionSesion: DuracionSesion; // cuánto tiempo le gusta entrenar
  entorno: Entorno; // gimnasio completo o en casa con equipo mínimo
  experiencia: Experiencia;
  fecha: string;
}

export interface EjercicioPlan {
  wgerId: number;
  nombre: string;
  imagen: string | null;
  video: string | null;
  categoria: number; // categoría wger — permite sugerir alternativas equivalentes
  series: number;
  reps: string;
  descansoSeg: number;
}

export interface DiaPlan {
  nombre: string;
  ejercicios: EjercicioPlan[];
}

export interface Dieta {
  bmr: number;
  tdee: number;
  kcalObjetivo: number;
  proteinaG: number;
  grasaG: number;
  carbohidratosG: number;
  // Proyección hacia la meta (null si no hay peso objetivo)
  pesoObjetivoKg: number | null;
  cambioSemanalKg: number | null; // ritmo inicial; negativo = perder
  semanasEstimadas: number | null; // null si la simulación plachea antes de la meta
  /** Curva simulada semana a semana (modelo no lineal: agua/glucógeno inicial,
   *  TDEE recalculado al peso actual y termogénesis adaptativa). */
  proyeccion?: { s: number; p: number }[];
  nota: string;
}

export interface Plan {
  anamnesis: Anamnesis;
  dias: DiaPlan[];
  dieta: Dieta;
  generado: string;
}
