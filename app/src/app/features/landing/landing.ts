import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Aparece } from '../../core/aparece';
import { Icono } from '../../core/icono';

@Component({
  selector: 'app-landing',
  imports: [RouterLink, Icono, Aparece],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing {}
