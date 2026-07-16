import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/landing/landing').then((m) => m.Landing),
    title: 'Pegasus Fit — Tu plan de entrenamiento y dieta',
  },
  {
    path: 'rutina',
    loadComponent: () => import('./features/rutina/rutina').then((m) => m.Rutina),
    title: 'Mi Rutina',
  },
  {
    path: 'dieta',
    loadComponent: () => import('./features/dieta/dieta').then((m) => m.DietaPagina),
    title: 'Mi Dieta',
  },
  {
    path: 'anamnesis',
    loadComponent: () => import('./features/anamnesis/anamnesis').then((m) => m.Anamnesis),
    title: 'Evaluación inicial',
  },
  {
    path: 'perfil',
    loadComponent: () => import('./features/perfil/perfil').then((m) => m.Perfil),
    title: 'Mi Perfil',
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
    title: 'Iniciar sesión',
  },
  {
    path: 'registro',
    loadComponent: () => import('./features/auth/registro').then((m) => m.Registro),
    title: 'Crear cuenta',
  },
];
