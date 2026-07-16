import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Icono } from '../../core/icono';

/** MOCK de diseño: sin backend todavía — la auth real llegará con el BFF (spec §3.3). */
@Component({
  selector: 'app-registro',
  imports: [FormsModule, RouterLink, Icono],
  templateUrl: './registro.html',
})
export class Registro {
  readonly nombre = signal('');
  readonly correo = signal('');
  readonly clave = signal('');
  readonly acepta = signal(false);
  readonly cargando = signal(false);

  readonly valido = computed(
    () => this.nombre().length >= 2 && this.correo().includes('@') && this.clave().length >= 8 && this.acepta(),
  );

  crear(): void {
    this.cargando.set(true);
    setTimeout(() => this.cargando.set(false), 1200); // simulación
  }
}
