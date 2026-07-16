import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

interface ExerciseInfoResult {
  id: number;
  translations: { language: number; name: string }[];
  images: { image: string; is_main: boolean }[];
  videos: { video: string }[];
  equipment: { id: number }[];
}

export interface EjercicioCatalogo {
  id: number;
  nombre: string;
  imagen: string | null;
  video: string | null;
  equipo: number[];
}

/** Equipo apto para entrenar en casa (fixtures wger): peso corporal, mancuerna, banda, kettlebell. */
export const EQUIPO_CASA = new Set([7, 3, 11, 10]);

/** IDs de categoría wger (fixtures estándar). */
export const CAT = {
  ABS: 10,
  BRAZOS: 8,
  ESPALDA: 12,
  PANTORRILLAS: 14,
  CARDIO: 15,
  PECHO: 11,
  PIERNAS: 9,
  HOMBROS: 13,
} as const;

@Injectable({ providedIn: 'root' })
export class WgerService {
  private http = inject(HttpClient);
  private cache = new Map<number, EjercicioCatalogo[]>();

  /** wger devuelve URLs absolutas con el host del SITE_URL; se vuelven relativas para pasar por el proxy. */
  private rel(url: string | null | undefined): string | null {
    return url ? url.replace(/^https?:\/\/[^/]+/, '') : null;
  }

  async porCategoria(categoria: number, limite = 40): Promise<EjercicioCatalogo[]> {
    if (this.cache.has(categoria)) return this.cache.get(categoria)!;
    const data = await firstValueFrom(
      this.http.get<{ results: ExerciseInfoResult[] }>(
        `${environment.wgerApiUrl}/exerciseinfo/`,
        { params: { category: categoria, limit: limite, format: 'json' } },
      ),
    );
    const lista = data.results
      .map((r) => {
        const es = r.translations.find((t) => t.language === 4);
        const en = r.translations.find((t) => t.language === 2);
        const principal = r.images.find((i) => i.is_main) ?? r.images[0];
        return {
          id: r.id,
          nombre: (es ?? en ?? r.translations[0])?.name ?? `Ejercicio ${r.id}`,
          imagen: this.rel(principal?.image),
          video: this.rel(r.videos[0]?.video),
          equipo: (r.equipment ?? []).map((e) => e.id),
        };
      })
      .filter((e) => e.imagen);
    this.cache.set(categoria, lista);
    return lista;
  }
}
