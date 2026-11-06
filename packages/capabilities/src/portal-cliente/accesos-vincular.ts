import { defineCapability } from "../define";
import { vincularAcceso, vincularInputSchema } from "./accesos-vincular-logica";
import { accesoVistaSchema } from "./accesos-vista";
import { PERMISO_ACCESOS_MANAGE } from "./comun";

export const accesosVincular = defineCapability({
  id: "portal_cliente.accesos.vincular",
  descripcion:
    "Vincula a un usuario invitado al portal «cliente» con la cuenta de su cliente y fija las instalaciones que podrá ver (todas o solo algunas). Sin instalaciones habilitadas no ve nada. Un agente queda en aprobación humana.",
  permiso: PERMISO_ACCESOS_MANAGE,
  input: vincularInputSchema,
  output: accesoVistaSchema,
  // Gobierna el acceso de otra persona a datos de un cliente: para un agente es irreversible
  // (aprobación humana salvo autonomía «directo»), como core.supervisores.asignar.
  efecto: "irreversible",
  dryRun: true,
  async handler(ctx, input, { dryRun }) {
    return vincularAcceso(ctx, input, dryRun);
  },
});
