"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
function cargarEnv() {
    try {
        const contenido = (0, node_fs_1.readFileSync)((0, node_path_1.join)(process.cwd(), '.env'), 'utf8');
        for (const linea of contenido.split('\n')) {
            const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
            if (m && !process.env[m[1]])
                process.env[m[1]] = m[2];
        }
    }
    catch {
    }
}
async function bootstrap() {
    cargarEnv();
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({ origin: true });
    await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
//# sourceMappingURL=main.js.map