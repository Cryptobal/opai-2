import { defineCapability } from "../define";
import { accesoDelActor, exigirPortalOperativo } from "../portal-cliente/comun";
import { contextoCliente } from "./portal-cliente";
import { prerregistrosCrear } from "./prerregistros";
import { prerregistrosListar } from "./prerregistros-leer";

// Prerregistro de visitas desde el Portal Cliente (R13, CAR-539): las mismas reglas del ERP con el alcance del
// contacto (`contextoCliente`), que no hereda permisos finos (no ve patentes).

export const portalVisitasListar = defineCapability({
  id: "acceso.portal_visitas.listar",
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

export const portalVisitasCrear = defineCapability({
  id: "acceso.portal_visitas.crear",
  descripcion:
    "Portal Cliente: prerregistra una visita de uno o varios días (hasta 30) en una instalación de tu cuenta, con uno o varios visitantes. El guardia lo reconoce por su documento; del documento se guarda solo la huella y la máscara.",
  permiso: null,
  input: prerregistrosCrear.input,
  output: prerregistrosCrear.output,
  efecto: "escritura",
  dryRun: true,
  portales: ["cliente"],
  sensibles: ["visitantes"],
  async handler(ctx, i, modo) {
    exigirPortalOperativo((await accesoDelActor(ctx)).alcance);
    const { ctx: c } = await contextoCliente(ctx);
    return prerregistrosCrear.handler(c, i, modo);
  },
});
