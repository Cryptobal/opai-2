import { z } from "zod";

import { ajuste, campoAjuste } from "../core/config";
import { uuidSchema } from "../core/esquemas";
import { defineCapability } from "../define";
import { noEncontrado, prohibido } from "../errores";
import { accesoDelActor, exigirPortalOperativo } from "../portal-cliente/comun";
import { configDeCuenta } from "../portal-cliente/config-datos";
import { cursorDe, pagina } from "../core/maestros/comun";
import { dondeInstalacionId, instalacionEnAlcance } from "../rondas/comun";
import type { Contexto } from "../types";
import { entradaListaSchema, TIPOS_LISTA, vistaEntrada } from "./comun";
import { listasQuitar } from "./listas";
import { agregarEntrada, inputAgregarEntrada } from "./listas-agregar";
import { inputPaginaAcceso } from "./pagina-alcance";
import { contextoCliente } from "./portal-cliente";

/** Ajuste de empresa que declara CAR-479 (#917) en el manifest de `acceso`: «el cliente gestiona la lista de sus instalaciones». */
const AJUSTE_EMPRESA = "cliente_gestiona_listas";

/**
 * Si el contacto puede gestionar las listas de sus instalaciones (R12). Único punto de decisión: el interruptor de
 * la empresa (CAR-479; mientras el ajuste no esté declarado, apagado) y la opción «gestiona listas» de su cuenta
 * en la configuración del Portal Cliente. Sin ambos, FORBIDDEN.
 */
async function clienteConListas(ctx: Contexto) {
  const c = await contextoCliente(ctx);
  const empresa =
    campoAjuste("acceso", AJUSTE_EMPRESA) !== undefined &&
    (await ajuste<boolean>(ctx, "acceso", AJUSTE_EMPRESA)) === true;
  if (!empresa || !(await configDeCuenta(ctx, c.cuentaId)).config.gestionaListas)
    throw prohibido("Tu empresa de seguridad no habilitó la gestión de listas en tu portal.");
  return c;
}

export const portalListasListar = defineCapability({
  id: "acceso.portal_listas.listar",
  descripcion:
    "Portal Cliente: entradas de la lista autorizada o bloqueada de una instalación de tu cuenta, de la más nueva a la más antigua y con el documento enmascarado. Marca las que agregó tu empresa; el motivo de un bloqueo de tu proveedor de seguridad no se muestra.",
  permiso: null,
  input: z.object({
    instalacionId: uuidSchema,
    tipo: z.enum(TIPOS_LISTA).optional(),
    ...inputPaginaAcceso,
  }),
  output: z.object({ items: z.array(entradaListaSchema), siguiente: z.string().nullable() }),
  efecto: "lectura",
  dryRun: false,
  portales: ["cliente"],
  auditarLectura: (salida) => salida.items.map((e) => e.id),
  async handler(ctx, { instalacionId, tipo, cursor, limite }) {
    const { ctx: c } = await clienteConListas(ctx);
    await instalacionEnAlcance(c, instalacionId);
    const filas = await ctx.db.entradaLista.findMany({
      where: { AND: [{ instalacionId }, dondeInstalacionId(c)], ...(tipo ? { tipo } : {}) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      ...cursorDe(cursor, limite),
    });
    const { items, siguiente } = pagina(filas, limite, cursor);
    const vistas = items.map(vistaEntrada);
    return { siguiente, items: vistas.map((e) => (e.deCliente ? e : { ...e, motivo: null })) };
  },
});

export const portalListasAgregar = defineCapability({
  id: "acceso.portal_listas.agregar",
  descripcion:
    "Portal Cliente: agrega una persona a la lista autorizada o bloqueada de una instalación de tu cuenta, con el RUN validado por su dígito verificador. Solo aplica a esa instalación y la lista bloqueada de tu proveedor de seguridad sigue mandando. Un bloqueo exige motivo y, para un agente, aprobación humana.",
  permiso: null,
  input: inputAgregarEntrada,
  output: entradaListaSchema,
  efecto: "escritura",
  dryRun: true,
  portales: ["cliente"],
  sensibles: ["documento"],
  exigeAprobacion: (i) => i.tipo === "bloqueada",
  async handler(ctx, i, { dryRun }) {
    exigirPortalOperativo((await accesoDelActor(ctx)).alcance);
    const { ctx: c, cuentaId } = await clienteConListas(ctx);
    return agregarEntrada(c, i, dryRun, cuentaId);
  },
});

export const portalListasQuitar = defineCapability({
  id: "acceso.portal_listas.quitar",
  descripcion:
    "Portal Cliente: quita una entrada que agregó tu empresa en la lista de una de tus instalaciones. Las que agregó tu proveedor de seguridad no se pueden quitar desde el portal.",
  permiso: null,
  input: z.object({ id: uuidSchema }),
  output: listasQuitar.output,
  efecto: "escritura",
  dryRun: true,
  portales: ["cliente"],
  async handler(ctx, { id }, modo) {
    exigirPortalOperativo((await accesoDelActor(ctx)).alcance);
    const { ctx: c, cuentaId } = await clienteConListas(ctx);
    const e = await ctx.db.entradaLista.findFirst({
      where: { AND: [{ id }, dondeInstalacionId(c)] },
      select: { cuentaId: true },
    });
    if (!e) throw noEncontrado("La entrada de lista");
    if (e.cuentaId !== cuentaId)
      throw prohibido("Esta entrada la agregó tu proveedor de seguridad: solo él puede quitarla.");
    return listasQuitar.handler(c, { id }, modo);
  },
});
