export type Objetivo = 'hipertrofia' | 'perdida_grasa' | 'acondicionamiento';
export type Experiencia = 'principiante' | 'intermedio' | 'avanzado';
export type Sexo = 'masculino' | 'femenino';

export interface Anamnesis {
  // Filtro de seguridad (regla de oro: cualquier "sí" bloquea la generación)
  saludRespuestas: Record<string, boolean>;
  // Datos corporales
  sexo: Sexo;
  edad: number;
  pesoKg: number;
  tallaCm: number;
  // Metas
  objetivo: Objetivo;
  diasSemana: 2 | 3 | 4 | 5;
  experiencia: Experiencia;
  fecha: string;
}

export interface EjercicioPlan {
  wgerId: number;
  nombre: string;
  imagen: string | null;
  video: string | null;
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
  nota: string;
}

export interface Plan {
  anamnesis: Anamnesis;
  dias: DiaPlan[];
  dieta: Dieta;
  generado: string;
}
