import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Icono } from '../../core/icono';
import { PlanService } from '../../core/plan.service';

@Component({
  selector: 'app-registro',
  imports: [FormsModule, RouterLink, Icono],
  templateUrl: './registro.html',
})
export class Registro {
  private auth = inject(AuthService);
  private planService = inject(PlanService);
  private router = inject(Router);

  readonly nombre = signal('');
  readonly correo = signal('');
  readonly clave = signal('');
  readonly acepta = signal(false);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  /** Si venía como invitado con plan, se lo decimos: registrarse lo guarda. */
  readonly traePlan = computed(() => this.planService.plan() !== null);

  readonly valido = computed(
    () => this.nombre().length >= 2 && this.correo().includes('@') && this.clave().length >= 8 && this.acepta(),
  );

  async crear(): Promise<void> {
    if (!this.valido() || this.cargando()) return;
    this.cargando.set(true);
    this.error.set(null);
    try {
      // El PlanService adopta automáticamente el plan de invitado al entrar la sesión
      await this.auth.registrar(this.nombre().trim(), this.correo().trim(), this.clave());
      await this.router.navigate(['/home']);
    } catch (e: unknown) {
      const err = e as { error?: { errors?: { message?: string }[] } };
      this.error.set(err?.error?.errors?.[0]?.message ?? 'No se pudo crear la cuenta. Intenta con otro nombre de usuario.');
    } finally {
      this.cargando.set(false);
    }
  }
}
