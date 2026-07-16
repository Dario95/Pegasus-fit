import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Icono } from '../../core/icono';

/** MOCK de diseño: sin backend todavía — la auth real llegará con el BFF (spec §3.3). */
@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink, Icono],
  templateUrl: './login.html',
})
export class Login {
  readonly correo = signal('');
  readonly clave = signal('');
  readonly cargando = signal(false);

  entrar(): void {
    this.cargando.set(true);
    setTimeout(() => this.cargando.set(false), 1200); // simulación
  }
}
