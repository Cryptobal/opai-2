import { z } from "zod";

import { PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { conflicto } from "../../errores";
import type { Contexto } from "../../types";
import { uuidSchema } from "../esquemas";
import { definidos, escribirConEvento, opcionalAFecha, otroQue, sinDuplicado } from "./comun";
import { cuentaDe } from "./cuentas";
import { camposCuenta, cuentaSchema, vistaCuenta } from "./cuentas-vista";

const DUPLICADO = "Ya existe una cuenta con ese RUT.";

export async function rutLibre(ctx: Contexto, rut: string | null | undefined, excepto?: string) {
  if (!rut) return;
  const otra = await ctx.db.cuenta.findFirst({ where: { rut, ...otroQue(excepto) } });
  if (otra) throw conflicto(`${DUPLICADO} (${otra.nombre}).`);
}

export const cuentasCreate = defineCapability({
  id: "core.cuentas.create",
  descripcion:
    "Crea una cuenta (por defecto como prospecto). El RUT se valida y normaliza; si otra cuenta ya lo tiene, responde CONFLICT con su nombre.",
  permiso: PERMISOS_CORE.cuentasManage,
  input: z.object(camposCuenta),
  output: cuentaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    await rutLibre(ctx, input.rut);
    const data = definidos({ ...input, escrituraFecha: opcionalAFecha(input.escrituraFecha) });
    if (dryRun) {
      const vacio = {
        razonSocial: null,
        rut: null,
        giro: null,
        origen: null,
        sitioWeb: null,
        calle: null,
        comuna: null,
        region: null,
        escrituraFecha: null,
        escrituraNotaria: null,
        notas: null,
      };
      return vistaCuenta({
        ...vacio,
        ...data,
        id: "",
        estado: "prospecto",
        clienteDesde: null,
        clienteHasta: null,
        archivadaEn: null,
        createdAt: new Date(),
      });
    }
    const c = await escribirConEvento(
      ctx,
      { tipo: "core.cuenta.creada", entidadTipo: "cuenta" },
      (tx) =>
        sinDuplicado(
          tx.cuenta.create({ data: { ...data, estado: "prospecto", tenantId: ctx.tenantId } }),
          DUPLICADO,
        ),
    );
    return vistaCuenta(c);
  },
});

export const cuentasUpdate = defineCapability({
  id: "core.cuentas.update",
  descripcion:
    "Actualiza los datos de una cuenta (nombre, razón social, RUT, giro, dirección, escritura, notas). Solo cambia los campos enviados.",
  permiso: PERMISOS_CORE.cuentasManage,
  input: z.object({ id: uuidSchema, ...z.object(camposCuenta).partial().shape }),
  output: cuentaSchema,
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, { id, ...cambios }, { dryRun }) {
    const actual = await cuentaDe(ctx, id);
    await rutLibre(ctx, cambios.rut, id);
    const data = definidos({ ...cambios, escrituraFecha: opcionalAFecha(cambios.escrituraFecha) });
    if (dryRun) return vistaCuenta({ ...actual, ...data });
    const c = await escribirConEvento(
      ctx,
      {
        tipo: "core.cuenta.actualizada",
        entidadTipo: "cuenta",
        payload: () => ({ campos: Object.keys(data) }),
      },
      (tx) => sinDuplicado(tx.cuenta.update({ where: { id }, data }), DUPLICADO),
    );
    return vistaCuenta(c);
  },
});
