import { z } from "zod";

import {
  CAMPOS_SII,
  compararConSii,
  normalizarRut,
  PERMISOS_CORE,
  REQUISITOS_FACTURAR,
} from "@opai/domain";

import { defineCapability } from "../../define";
import { externo } from "../../externo";
import { reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { cuentaDe } from "./cuentas";
import { consultarContribuyente, facturableDe, valoresSii } from "./cuentas-sii-fuente";

const facturarSchema = z.object({
  lista: z.boolean(),
  faltan: z.array(z.enum([...REQUISITOS_FACTURAR, "destinatario"])),
});

const campoSchema = z.object({
  campo: z.enum(CAMPOS_SII),
  ficha: z.string().nullable(),
  sii: externo(z.string().nullable()),
  estado: z.enum(["igual", "distinto", "vacio_ficha", "vacio_sii"]),
});

export const cuentasConsultarSii = defineCapability({
  auditarLectura: (s, e) => [e.id],
  id: "core.cuentas.consultar_sii",
  descripcion:
    "Consulta al SII los datos tributarios de una cuenta por su RUT (razón social, giro, actividades, dirección, correo DTE e inicio de actividades) y los compara campo por campo con la ficha. No cambia nada: para aplicarlos usa core.cuentas.aplicar_sii. Dice si la cuenta queda lista para facturar.",
  permiso: PERMISOS_CORE.cuentasRead,
  input: z.object({ id: uuidSchema }),
  output: z.object({
    estado: z.enum(["ok", "sin_inicio", "no_encontrado", "sin_respuesta", "no_configurado"]),
    mensaje: externo(z.string().nullable()),
    rut: z.string(),
    actividades: z.array(
      z.object({ codigo: z.string(), descripcion: externo(z.string()), afectaIva: z.boolean() }),
    ),
    inicioActividades: z.string().nullable(),
    campos: z.array(campoSchema),
    facturar: facturarSchema,
    /** «Lista para facturar» si se aplicaran todos los campos del SII. */
    facturarAlAplicar: facturarSchema,
  }),
  efecto: "lectura",
  dryRun: false,
  async handler(ctx, input) {
    const c = await cuentaDe(ctx, input.id);
    const rut = c.rut ? normalizarRut(c.rut) : null;
    if (!rut)
      throw reglaDeNegocio(
        "La cuenta no tiene un RUT válido; corrígelo antes de consultar al SII.",
      );
    const facturar = await facturableDe(ctx, c);
    const r = await consultarContribuyente(ctx, rut);
    const datos = r.estado === "ok" || r.estado === "sin_inicio" ? r.datos : null;
    const sii = datos ? valoresSii(datos) : {};
    const campos = datos ? compararConSii(c, sii) : [];
    const alAplicar = datos
      ? await facturableDe(ctx, {
          ...c,
          ...Object.fromEntries(Object.entries(sii).filter(([, v]) => v)),
        })
      : facturar;
    return {
      estado: r.estado,
      mensaje: "mensaje" in r ? r.mensaje : null,
      rut,
      actividades: datos?.actividades.map((a) => ({ ...a })) ?? [],
      inicioActividades: datos?.inicioActividades ?? null,
      campos,
      facturar,
      facturarAlAplicar: alAplicar,
    };
  },
});

export const cuentasFacturable = defineCapability({
  auditarLectura: (_s, e) => [e.id],
  id: "core.cuentas.facturable",
  descripcion:
    "Dice si una cuenta está lista para facturar (RUT válido, razón social, giro, dirección, comuna y un destinatario: correo DTE o contacto con rol facturación) y qué le falta. No consulta al SII.",
  permiso: PERMISOS_CORE.cuentasRead,
  input: z.object({ id: uuidSchema }),
  output: facturarSchema,
  efecto: "lectura",
  dryRun: false,
  handler: async (ctx, input) => facturableDe(ctx, await cuentaDe(ctx, input.id)),
});

export const cuentasAplicarSii = defineCapability({
  id: "core.cuentas.aplicar_sii",
  descripcion:
    "Aplica a la ficha de una cuenta los datos del SII de los campos que se elijan (razón social, giro, dirección, comuna, ciudad, correo DTE), consultando de nuevo al SII; los demás quedan como están. La vista previa dice qué cambia sin guardar.",
  permiso: PERMISOS_CORE.cuentasManage,
  input: z.object({
    id: uuidSchema,
    campos: z.array(z.enum(CAMPOS_SII)).min(1).max(CAMPOS_SII.length),
  }),
  output: z.object({
    cambios: z.array(
      z.object({
        campo: z.enum(CAMPOS_SII),
        antes: z.string().nullable(),
        despues: externo(z.string()),
      }),
    ),
    facturar: facturarSchema,
  }),
  efecto: "escritura",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    const c = await cuentaDe(ctx, input.id);
    const rut = c.rut ? normalizarRut(c.rut) : null;
    if (!rut)
      throw reglaDeNegocio(
        "La cuenta no tiene un RUT válido; corrígelo antes de consultar al SII.",
      );
    // Se consulta de nuevo: nunca se aplica un valor que venga del input (es dato del SII, no del cliente).
    const r = await consultarContribuyente(ctx, rut);
    if (r.estado !== "ok" && r.estado !== "sin_inicio") throw reglaDeNegocio(r.mensaje);
    const sii = valoresSii(r.datos);
    const pedidos = new Set(input.campos);
    const cambios = compararConSii(c, sii)
      .filter(
        (x) => pedidos.has(x.campo) && (x.estado === "distinto" || x.estado === "vacio_ficha"),
      )
      .map((x) => ({ campo: x.campo, antes: x.ficha, despues: x.sii as string }));
    const data = Object.fromEntries(cambios.map((x) => [x.campo, x.despues]));
    const facturar = await facturableDe(ctx, { ...c, ...data });
    if (dryRun || !cambios.length) return { cambios, facturar };
    await ctx.transaccion(async (tx) => {
      await tx.cuenta.update({ where: { id: c.id }, data });
      await ctx.eventos.emitir(tx, {
        tipo: "core.cuenta.actualizada",
        entidadTipo: "cuenta",
        entidadId: c.id,
        payload: { campos: Object.keys(data), origen: "sii" },
      });
    });
    return { cambios, facturar };
  },
});
