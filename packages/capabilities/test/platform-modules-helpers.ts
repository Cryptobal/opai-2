import { z } from "zod";

import { defineModule } from "../src/module";
import { USUARIO_DE_PRUEBA } from "../src/testing";

export const modulo = (id: string, dependencias: string[] = []) =>
  defineModule({
    id,
    nombre: id.toUpperCase(),
    version: "0.1.0",
    dependencias,
    permisos: [],
    navegacion: [],
    configuracion: z.object({}),
    eventos: [],
    capacidades: [],
  });

export const plataforma = { ...USUARIO_DE_PRUEBA, platformRole: "owner" as const };