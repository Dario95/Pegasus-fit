import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/** Carga .env local sin dependencias (GEMINI_API_KEY, etc.). */
function cargarEnv() {
  try {
    const contenido = readFileSync(join(process.cwd(), '.env'), 'utf8');
    for (const linea of contenido.split('\n')) {
      const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* sin .env — se usan variables del entorno */
  }
}

async function bootstrap() {
  cargarEnv();
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true }); // dev: la app Angular corre en :4200
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
