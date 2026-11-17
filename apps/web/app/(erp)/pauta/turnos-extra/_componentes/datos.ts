import { formatearClp } from "@opai/domain";

import { estadoPantalla } from "@/lib/formato";
import { requerirUuid } from "@/lib/ids";
import type { Parametros } from "@/lib/parametros";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";
import type { InstalacionFila, Pagina } from "@/lib/tipos-maestros";

import type { TurnoExtra, TurnoExtraFila } from "./tipos";

type PersonaGet = { id: string; nombreCompleto: string };
type PuestoGet = { id: string; nombre: string; instalacionId: string };
type InstGet = { id: string; nombre: string };

async function enriquecer(items: TurnoExtra[]): Promise<TurnoExtraFila[]> {
  if (!items.length) return [];
  const personaIds = [...new Set(items.map((i) => i.personaId))];
  const puestoIds = [...new Set(items.map((i) => i.puestoId))];
  const [personas, puestos] = await Promise.all([
    Promise.all(
      personaIds.map((id) => ejecutarComoUsuario<PersonaGet>("erp", "core.personas.get", { id })),
    ),
    Promise.all(puestoIds.map((id) => ejecutarComoUsuario<PuestoGet>("erp", "core.puestos.get", { id }))),
  ]);
  const pn = new Map(
    personaIds.map((id, i) => [id, personas[i]?.ok ? personas[i]!.data.nombreCompleto : "Persona"]),
  );
  const puestoPorId = new Map(
    puestoIds.map((id, i) => [id, puestos[i]?.ok ? puestos[i]!.data : null]),
  );
  const instIds = [...new Set([...puestoPorId.values()].filter(Boolean).map((p) => p!.instalacionId))];
  const insts = await Promise.all(
    instIds.map((id) => ejecutarComoUsuario<InstGet>("erp", "core.instalaciones.get", { id })),
  );
  const instN = new Map(insts.filter((r) => r.ok).map((r) => [r.data!.id, r.data!.nombre]));
  return items.map((t) => {
    const p = puestoPorId.get(t.puestoId);
    return {
      ...t,
      personaNombre: pn.get(t.personaId) ?? "Persona",
      puestoNombre: p?.nombre ?? "Puesto",
      instalacionNombre: p ? instN.get(p.instalacionId) ?? "Instalación" : "Instalación",
    };
  });
}

export async function cargarTurnosExtra(p: Parametros) {
  const estado = (p.estado as TurnoExtra["estado"] | undefined) ?? "por_aprobar";
  const instalacionId = p.inst ? requerirUuid(p.inst) : undefined;
  const ver = p.ver ? requerirUuid(p.ver) : null;
  const identidad = await requerirIdentidad("/pauta/turnos-extra");
  const [lista, instalaciones] = await Promise.all([
    ejecutarComoUsuario<{ items: TurnoExtra[]; siguiente: string | null }>("erp", "pauta.turnos_extra.listar", {
      estado,
      ...(instalacionId ? { instalacionId } : {}),
      limite: 50,
    }),
    ejecutarComoUsuario<Pagina<InstalacionFila>>("erp", "core.instalaciones.list", { limite: 100 }),
  ]);
  const items = lista.ok ? await enriquecer(lista.data.items) : [];
  const turno = ver ? items.find((i) => i.id === ver) ?? null : null;
  return {
    state: estadoPantalla(lista),
    estado,
    instalacionId: instalacionId ?? null,
    instalaciones: instalaciones.ok ? instalaciones.data.items.map((i) => ({ id: i.id, nombre: i.nombre })) : [],
    items,
    totalClp: formatearClp(items.reduce((s, i) => s + i.montoClp, 0)),
    ver,
    turno,
    puedeAprobar: puedeDeIdentidad(identidad)("pauta:aprobar_extra"),
    yoId: identidad.usuario.id,
  };
}

export type DatosTurnosExtra = Awaited<ReturnType<typeof cargarTurnosExtra>>;