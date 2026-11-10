import { z } from "zod";

import { CAMPOS_SII, compararConSii, normalizarRut, PERMISOS_CORE } from "@opai/domain";

import { defineCapability } from "../../define";
import { externo } from "../../externo";
import { reglaDeNegocio } from "../../errores";
import { uuidSchema } from "../esquemas";
import { cuentaDe } from "./cuentas";
import { consultarContribuyente } from "./cuentas-sii-cache";
import { consultaSiiSchema, facturarSchema } from "./cuentas-sii-esquemas";
import { facturableDe, valoresSii } from "./cuentas-sii-fuente";

export const cuentasConsultarSii = defineCapability({
  auditarLectura: (s, e) => [e.id],
  id: "core.cuentas.consultar_sii",
  descripcion:
    "Consulta al SII los datos tributarios de una cuenta por su RUT (razón social, giro, actividades, dirección, correo DTE e inicio de actividades) y los compara campo por campo con la ficha. Reutiliza la respuesta guardada mientras esté vigente (dice de cuándo es); `refrescar` vuelve a preguntar si tiene más de 10 minutos. No cambia nada: para aplicarlos usa core.cuentas.aplicar_sii. Dice si la cuenta queda lista para facturar.",
  permiso: PERMISOS_CORE.cuentasRead,
  input: z.object({
    id: uuidSchema,
    refrescar: z
      .boolean()
      .optional()
      .describe("Volver a preguntar al SII aunque haya una respuesta guardada vigente."),
  }),
  output: consultaSiiSchema,
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
    const r = await consultarContribuyente(ctx, rut, { refrescar: input.refrescar ?? false });
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
      origen: r.origen,
      consultadoEn: r.consultadoEn?.toISOString() ?? null,
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
    "Aplica a la ficha de una cuenta los datos del SII de los campos que se elijan (razón social, giro, dirección, comuna, ciudad, correo DTE), tomados de la respuesta guardada del SII si está vigente o consultando de nuevo, nunca del input; los demás quedan como están. La vista previa dice qué cambia sin guardar.",
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
    // Del SII (caché vigente o consulta nueva): nunca se aplica un valor que venga del input. La
    // vista previa no escribe la caché.
    const r = await consultarContribuyente(ctx, rut, { guardar: !dryRun });
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
