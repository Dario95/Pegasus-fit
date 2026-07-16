import { BadGatewayException, BadRequestException, Body, Controller, Post } from '@nestjs/common';

interface SolicitudRecetas {
  alimentos: string;
  kcalEntrenamiento: number;
  kcalDescanso: number;
  proteinaG: number;
  diasGym: number;
  objetivo: string;
}

/**
 * Menú semanal con Gemini (plan gratuito). La API key vive AQUÍ, en el
 * servidor (.env) — nunca en el frontend. Modelo flash-lite: cuota gratuita
 * separada del flash normal.
 */
@Controller('recetas')
export class RecetasController {
  @Post()
  async generar(@Body() s: SolicitudRecetas): Promise<{ menu: string }> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new BadGatewayException('Falta GEMINI_API_KEY en el .env del BFF');
    if (!s?.alimentos?.trim()) throw new BadRequestException('Indica qué alimentos tienes');

    const prompt = `Eres nutricionista deportivo. Mi objetivo es ${s.objetivo} y entreno ${s.diasGym} días por semana.
Metas diarias: ~${s.kcalEntrenamiento} kcal los días de gym, ~${s.kcalDescanso} kcal los días de descanso, y ${s.proteinaG} g de proteína SIEMPRE.
Tengo estos alimentos a mano: ${s.alimentos}.

Arma un menú de 7 días (indica cuáles son de gym y cuáles de descanso) con 4 comidas por día (desayuno, almuerzo, merienda, cena), usando principalmente mis alimentos (puedes sugerir 2-3 compras básicas extra). Da porciones aproximadas en gramos o medidas caseras. Sé compacto: una línea por comida. En español. Sin introducción ni despedida.`;

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1400 },
        }),
      },
    );
    if (!r.ok) {
      throw new BadGatewayException(`Gemini respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
    }
    const data = (await r.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const menu = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
    if (!menu) throw new BadGatewayException('Gemini no devolvió contenido');
    return { menu };
  }
}
