import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Auth real contra wger vía django-allauth headless (cliente "app"):
 *   POST /allauth/app/v1/auth/signup | /auth/login → session_token + access_token (JWT)
 * El JWT sirve como Bearer para /api/v2 (rutinas, logs) en fases siguientes.
 */

export interface Usuario {
  id: number;
  username: string;
  email?: string;
}

interface RespuestaAllauth {
  status: number;
  data: { user: { id: number; username: string; email?: string } };
  meta: { is_authenticated: boolean; session_token: string; access_token: string };
}

const STORAGE_SESION = 'pegasus.sesion';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);

  readonly usuario = signal<Usuario | null>(this.cargarSesion()?.usuario ?? null);
  readonly accessToken = signal<string | null>(this.cargarSesion()?.accessToken ?? null);

  private cargarSesion(): { usuario: Usuario; accessToken: string } | null {
    try {
      const raw = localStorage.getItem(STORAGE_SESION);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private guardarSesion(r: RespuestaAllauth): Usuario {
    const usuario: Usuario = {
      id: r.data.user.id,
      username: r.data.user.username,
      email: r.data.user.email,
    };
    localStorage.setItem(
      STORAGE_SESION,
      JSON.stringify({ usuario, accessToken: r.meta.access_token, sessionToken: r.meta.session_token }),
    );
    this.usuario.set(usuario);
    this.accessToken.set(r.meta.access_token);
    return usuario;
  }

  async registrar(username: string, email: string, password: string): Promise<Usuario> {
    const r = await firstValueFrom(
      this.http.post<RespuestaAllauth>(`${environment.authUrl}/auth/signup`, {
        username,
        email,
        password,
      }),
    );
    return this.guardarSesion(r);
  }

  async login(username: string, password: string): Promise<Usuario> {
    const r = await firstValueFrom(
      this.http.post<RespuestaAllauth>(`${environment.authUrl}/auth/login`, {
        username,
        password,
      }),
    );
    return this.guardarSesion(r);
  }

  salir(): void {
    localStorage.removeItem(STORAGE_SESION);
    this.usuario.set(null);
    this.accessToken.set(null);
  }
}
