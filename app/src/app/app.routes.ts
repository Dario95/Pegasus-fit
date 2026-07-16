import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'rutina' },
  {
    path: 'rutina',
    loadComponent: () => import('./features/rutina/rutina').then((m) => m.Rutina),
    title: 'Mi Rutina',
  },
  {
    path: 'acceso',
    loadComponent: () => import('./features/acceso/acceso').then((m) => m.Acceso),
    title: 'Acceso',
  },
  {
    path: 'anamnesis',
    loadComponent: () => import('./features/anamnesis/anamnesis').then((m) => m.Anamnesis),
    title: 'Evaluación inicial',
  },
];
