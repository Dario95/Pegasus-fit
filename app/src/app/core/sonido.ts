/**
 * Sonidos del entrenamiento vía Web Audio (sin archivos). El contexto se crea
 * en el primer gesto del usuario (requisito de los navegadores móviles).
 */
let ctx: AudioContext | null = null;

function tono(freq: number, durMs: number, vol = 0.18, delayMs = 0): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const t0 = ctx.currentTime + delayMs / 1000;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + durMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + durMs / 1000 + 0.05);
  } catch {
    /* sin audio disponible */
  }
}

/** Tic corto de cuenta regresiva (3, 2, 1…). */
export function beepCuenta(): void {
  tono(880, 110);
}

/** Fin del descanso: doble tono ascendente + vibración. */
export function beepFin(): void {
  tono(1046, 160);
  tono(1318, 260, 0.2, 180);
  try {
    navigator.vibrate?.([160, 60, 160]);
  } catch {
    /* sin vibración */
  }
}

/** Confirmación suave (serie registrada). */
export function beepOk(): void {
  tono(660, 90, 0.12);
}
