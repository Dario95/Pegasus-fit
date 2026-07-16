"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecetasController = void 0;
const common_1 = require("@nestjs/common");
let RecetasController = class RecetasController {
    async generar(s) {
        const key = process.env.GEMINI_API_KEY;
        if (!key)
            throw new common_1.BadGatewayException('Falta GEMINI_API_KEY en el .env del BFF');
        if (!s?.alimentos?.trim())
            throw new common_1.BadRequestException('Indica qué alimentos tienes');
        const prompt = `Eres nutricionista deportivo. Mi objetivo es ${s.objetivo} y entreno ${s.diasGym} días por semana.
Metas diarias: ~${s.kcalEntrenamiento} kcal los días de gym, ~${s.kcalDescanso} kcal los días de descanso, y ${s.proteinaG} g de proteína SIEMPRE.
Tengo estos alimentos a mano: ${s.alimentos}.

Arma un menú de 7 días (indica cuáles son de gym y cuáles de descanso) con 4 comidas por día (desayuno, almuerzo, merienda, cena), usando principalmente mis alimentos (puedes sugerir 2-3 compras básicas extra). Da porciones aproximadas en gramos o medidas caseras. Sé compacto: una línea por comida. En español. Sin introducción ni despedida.`;
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 1400 },
            }),
        });
        if (!r.ok) {
            throw new common_1.BadGatewayException(`Gemini respondió ${r.status}: ${(await r.text()).slice(0, 200)}`);
        }
        const data = (await r.json());
        const menu = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
        if (!menu)
            throw new common_1.BadGatewayException('Gemini no devolvió contenido');
        return { menu };
    }
};
exports.RecetasController = RecetasController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RecetasController.prototype, "generar", null);
exports.RecetasController = RecetasController = __decorate([
    (0, common_1.Controller)('recetas')
], RecetasController);
//# sourceMappingURL=recetas.controller.js.map