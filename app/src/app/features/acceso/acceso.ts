import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { Icono } from '../../core/icono';

/**
 * MOCK de diseño: QR simulado que rota cada 15 s y aforo con datos falsos.
 * El QR real (TOTP) y el aforo en vivo llegan con el servicio de acceso (spec §3.3).
 */
@Component({
  selector: 'app-acceso',
  imports: [Icono],
  templateUrl: './acceso.html',
  styleUrl: './acceso.scss',
})
export class Acceso implements OnInit, OnDestroy {
  private intervalo?: ReturnType<typeof setInterval>;

  readonly segundos = signal(15);
  readonly semilla = signal(0); // regenera el patrón del QR simulado
  readonly celdas = computed(() => {
    // Patrón pseudoaleatorio determinista por semilla (solo estética)
    const s = this.semilla();
    const celdas: boolean[] = [];
    let x = 1234567 + s * 999331;
    for (let i = 0; i < 441; i++) {
      x = (x * 1103515245 + 12345) % 2147483648;
      celdas.push(x % 100 < 46);
    }
    return celdas;
  });

  // Aforo simulado
  readonly ocupacion = 34;
  readonly horas = [
    { h: '6a', v: 55 }, { h: '8a', v: 80 }, { h: '10a', v: 40 }, { h: '12p', v: 30 },
    { h: '2p', v: 25 }, { h: '4p', v: 45 }, { h: '6p', v: 95 }, { h: '8p', v: 70 }, { h: '10p', v: 30 },
  ];

  ngOnInit(): void {
    this.intervalo = setInterval(() => {
      this.segundos.update((s) => {
        if (s <= 1) {
          this.semilla.update((x) => x + 1);
          return 15;
        }
        return s - 1;
      });
    }, 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.intervalo);
  }
}
