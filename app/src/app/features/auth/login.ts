import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Icono } from '../../core/icono';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, Icono],
  templateUrl: './login.html',
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly usuario = signal('');
  readonly clave = signal('');
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  async entrar(): Promise<void> {
    if (this.cargando()) return;
    this.cargando.set(true);
    this.error.set(null);
    try {
      await this.auth.login(this.usuario().trim(), this.clave());
      await this.router.navigate(['/rutina']);
    } catch {
      this.error.set('Usuario o contraseña incorrectos.');
    } finally {
      this.cargando.set(false);
    }
  }
}
