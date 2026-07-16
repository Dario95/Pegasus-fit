import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icono } from './core/icono';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icono],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
