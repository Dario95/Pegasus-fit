interface SolicitudRecetas {
    alimentos: string;
    kcalEntrenamiento: number;
    kcalDescanso: number;
    proteinaG: number;
    diasGym: number;
    objetivo: string;
}
export declare class RecetasController {
    generar(s: SolicitudRecetas): Promise<{
        menu: string;
    }>;
}
export {};
