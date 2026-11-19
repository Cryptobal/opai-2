import {
  PERSONA_ESTADO_BLOQUEADO_PERMANENTE,
  puedeTransicionarPersona,
  personaAdmiteVinculoVigente,
  type EstadoPersona,
} from "@opai/domain";

import type { Capacidad } from "../../types";
import { reglaDeNegocio } from "../../errores";
import { escribirConEvento } from "./comun";
import { bloquearNoAnonimizado, exigirNoAnonimizado } from "./anonimizado";
import { personaDe, vinculosVigentes, vistaPersona } from "./personas-vista";

export async function aplicarEstadoPersona(
  ctx: Parameters<NonNullable<Capacidad["handler"]>>[0],
  id: string,
  hacia: EstadoPersona,
  dryRun: boolean,
  tipoEvento: string,
  extra?: Record<string, unknown>,
  forzar = false,
) {
  const actual = await personaDe(ctx, id);
  exigirNoAnonimizado(actual, "La persona");
  const desde = actual.estado ?? "activo";
  if (
    !forzar &&
    hacia !== PERSONA_ESTADO_BLOQUEADO_PERMANENTE &&
    !puedeTransicionarPersona(desde, hacia)
  ) {
    throw reglaDeNegocio(`Una persona en «${desde}» no puede pasar a «${hacia}».`);
  }
  const vigente = (await vinculosVigentes(ctx, [id])).get(id) ?? null;
  if (vigente && !personaAdmiteVinculoVigente(hacia)) {
    throw reglaDeNegocio("La persona tiene un vínculo vigente: termínalo antes de cambiar el estado.");
  }
  const data = { estado: hacia, ...extra };
  if (dryRun) return vistaPersona({ ...actual, ...data }, vigente);
  const p = await escribirConEvento(
    ctx,
    {
      tipo: tipoEvento,
      entidadTipo: "persona",
      payload: () => ({ desde, hacia }),
    },
    async (tx) => {
      await bloquearNoAnonimizado(tx, "persona", id);
      return tx.persona.update({ where: { id }, data });
    },
  );
  return vistaPersona(p, vigente);
}

export type DefTransicionPersona = {
  id: string;
  hacia: EstadoPersona;
  desde?: EstadoPersona;
  descripcion: string;
};