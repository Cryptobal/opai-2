import { z } from "zod";

import { PERMISOS_PLATAFORMA } from "@opai/domain";

import { defineCapability } from "../../define";
import { noEncontrado, reglaDeNegocio } from "../../errores";
import { requierePlataforma } from "../comun";
import { listarAjustes } from "./catalogo";
import { valorPorDefecto } from "./registro";

const deAmbitoPlataforma = () => listarAjustes().filter((c) => c.meta.ambito === "plataforma");

export const platformAjustesGet = defineCapability({
  id: "platform.ajustes.get",
  descripcion:
    "Plataforma: ajustes que fija OPAI para todas las empresas (modelos de IA por clase, ingreso mínimo…) con su valor vigente y el de fábrica.",
  permiso: PERMISOS_PLATAFORMA.tenantsRead,
  sinTenant: true,
  input: z.object({}),
  output: z.array(
    z.object({
      modulo: z.string(),
      clave: z.string(),
      etiqueta: z.string(),
      valor: z.unknown(),
      porDefecto: z.unknown(),
      version: z.number(),
    }),
  ),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx) {
    const filas = await requierePlataforma(ctx).globales.listarAjustes();
    return deAmbitoPlataforma().map((c) => {
      const f = filas.find((x) => x.modulo === c.modulo && x.clave === c.clave);
      const valido = f ? c.schema.safeParse(f.valor) : null;
      return {
        modulo: c.modulo,
        clave: c.clave,
        etiqueta: c.meta.etiqueta,
        valor: valido?.success ? valido.data : valorPorDefecto(c),
        porDefecto: valorPorDefecto(c),
        version: f?.version ?? 0,
      };
    });
  },
});

export const platformAjustesSet = defineCapability({
  id: "platform.ajustes.set",
  descripcion:
    "Plataforma: fija un ajuste de OPAI para todas las empresas (valida con su esquema y versiona). valor null vuelve al de fábrica.",
  permiso: PERMISOS_PLATAFORMA.tenantsManage,
  sinTenant: true,
  input: z.object({ modulo: z.string(), clave: z.string(), valor: z.unknown() }),
  output: z.object({
    modulo: z.string(),
    clave: z.string(),
    valor: z.unknown(),
    version: z.number(),
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const p = requierePlataforma(ctx);
    const c = deAmbitoPlataforma().find(
      (x) => x.modulo === input.modulo && x.clave === input.clave,
    );
    if (!c) throw noEncontrado(`El ajuste de plataforma ${input.modulo}.${input.clave}`);
    const r = input.valor === null ? null : c.schema.safeParse(input.valor);
    if (r && !r.success)
      throw reglaDeNegocio(`Valor inválido: ${r.error.issues[0]?.message ?? ""}`);
    const where = { modulo_clave: { modulo: c.modulo, clave: c.clave } };
    const previo = await p.globales.ajustePorClave(where);
    const version = (previo?.version ?? 0) + 1;
    const valor = r ? r.data : valorPorDefecto(c);
    if (dryRun) return { modulo: c.modulo, clave: c.clave, valor, version };
    const json = JSON.parse(JSON.stringify(valor));
    await p.globales.guardarAjuste({
      where,
      create: {
        modulo: c.modulo,
        clave: c.clave,
        valor: json,
        actualizadoPor: ctx.usuario?.id ?? null,
      },
      update: { valor: json, version, actualizadoPor: ctx.usuario?.id ?? null },
    });
    return { modulo: c.modulo, clave: c.clave, valor, version };
  },
});
