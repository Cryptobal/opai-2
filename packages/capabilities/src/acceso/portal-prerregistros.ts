import { defineCapability } from "../define";
import { noEncontrado } from "../errores";
import { dondeInstalacionId } from "../rondas/comun";
import { quien } from "./comun";
import { contextoCliente } from "./portal-cliente";
import { prerregistrosCancelar, prerregistrosCrear } from "./prerregistros";
import { prerregistrosInvitacion, prerregistrosListar } from "./prerregistros-leer";

// Prerregistro de visitas desde el Portal Cliente (R13, CAR-539): las mismas reglas del ERP con el alcance del
// contacto (`contextoCliente`), que no hereda permisos finos: no ve patentes y solo cancela lo que él creó.

export const portalPrerregistrosListar = defineCapability({
  id: "acceso.portal_prerregistros.listar",
  descripcion:
    "Portal Cliente: visitas prerregistradas en las instalaciones de tu cuenta, las de un día o sin día las vigentes y próximas, con el documento enmascarado y el estado de cada día.",
  permiso: null,
  input: prerregistrosListar.input,
  output: prerregistrosListar.output,
  efecto: "lectura",
  dryRun: false,
  portales: ["cliente"],
  auditarLectura: (salida) => salida.items.map((p) => p.id),
  async handler(ctx, input) {
    const { ctx: c } = await contextoCliente(ctx);
    return prerregistrosListar.handler(c, input, { dryRun: false });
  },
});

export const portalPrerregistrosCrear = defineCapability({
  id: "acceso.portal_prerregistros.crear",
  descripcion:
    "Portal Cliente: prerregistra una visita de uno o varios días (hasta 30) en una instalación de tu cuenta, con uno o varios visitantes. Cada visitante recibe un QR por día, de un solo uso; del documento se guarda solo la huella y la máscara.",
  permiso: null,
  input: prerregistrosCrear.input,
  output: prerregistrosCrear.output,
  efecto: "escritura",
  dryRun: true,
  portales: ["cliente"],
  sensibles: ["visitantes"],
  async handler(ctx, i, modo) {
    const { ctx: c } = await contextoCliente(ctx);
    return prerregistrosCrear.handler(c, i, modo);
  },
});

export const portalPrerregistrosCancelar = defineCapability({
  id: "acceso.portal_prerregistros.cancelar",
  descripcion:
    "Portal Cliente: cancela una visita que prerregistraste tú y que aún no termina; sus QR dejan de servir desde ese momento.",
  permiso: null,
  input: prerregistrosCancelar.input,
  output: prerregistrosCancelar.output,
  efecto: "escritura",
  dryRun: true,
  portales: ["cliente"],
  async handler(ctx, i, modo) {
    const { ctx: c } = await contextoCliente(ctx);
    return prerregistrosCancelar.handler(c, i, modo);
  },
});

export const portalPrerregistrosInvitacion = defineCapability({
  id: "acceso.portal_prerregistros.invitacion",
  descripcion:
    "Portal Cliente: invitación con el código QR de un día para un visitante de una visita que prerregistraste tú, para mostrarla o enviarla. Sirve una sola vez y solo ese día.",
  permiso: null,
  input: prerregistrosInvitacion.input,
  output: prerregistrosInvitacion.output,
  efecto: "lectura",
  dryRun: false,
  portales: ["cliente"],
  auditarLectura: (_salida, input) => [input.visitanteId],
  async handler(ctx, i) {
    const { ctx: c } = await contextoCliente(ctx);
    const yo = quien(c);
    const propio =
      yo &&
      (await ctx.db.prerregistroVisitante.findFirst({
        where: {
          id: i.visitanteId,
          prerregistro: { AND: [dondeInstalacionId(c), { creadoPor: yo }] },
        },
        select: { id: true },
      }));
    if (!propio) throw noEncontrado("El visitante");
    return prerregistrosInvitacion.handler(c, i, { dryRun: false });
  },
});
