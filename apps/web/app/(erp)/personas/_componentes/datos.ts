import { estadoPantalla } from "@/lib/formato";
import { requerirEncontrado, requerirUuid } from "@/lib/ids";
import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";
import type { Cargo, Pagina, PersonaDetalle, PersonaFila } from "@/lib/tipos-maestros";
import type { PuestoDeCargo, SueldoEfectivo, Vinculo } from "@/lib/tipos-sueldo";

export const POR_PAGINA = 50;

/** Cursores ya recorridos (`?prev=a,b`) para volver con "Anterior" en una paginación por cursor. */
export const anteriores = (p: Parametros) => (p["prev"] ? p["prev"].split(",") : []);

/** Personas filtradas (texto, cargo, estado) y paginadas por cursor, con cargos y total. */
export async function cargarPersonas(p: Parametros) {
  const [r, cargos, total] = await Promise.all([
    ejecutarComoUsuario<Pagina<PersonaFila>>("erp", "core.personas.list", {
      limite: POR_PAGINA,
      ...(p["q"] ? { q: p["q"] } : {}),
      ...(p["cargo"] ? { cargoId: p["cargo"] } : {}),
      ...(p["estado"] ? { estado: p["estado"] } : {}),
      ...(p["cursor"] ? { cursor: p["cursor"] } : {}),
    }),
    cargarCargos(),
    ejecutarComoUsuario<{ personas: number | null }>("erp", "core.resumen.contadores", {}),
  ]);
  return {
    state: estadoPantalla(r),
    items: r.ok ? r.data.items : [],
    siguiente: r.ok ? r.data.siguiente : null,
    total: total.ok ? total.data.personas : null,
    cargos: cargos.map((c) => ({ valor: c.id, etiqueta: c.nombre })),
  };
}

export async function cargarCargos(incluirInactivos = false) {
  const r = await ejecutarComoUsuario<Cargo[]>("erp", "core.cargos.list", { incluirInactivos });
  return r.ok ? r.data : [];
}

export async function cargarPersona(id: string) {
  const r = await ejecutarComoUsuario<PersonaDetalle>("erp", "core.personas.get", {
    id: requerirUuid(id),
  });
  requerirEncontrado(r);
  return { state: estadoPantalla(r), persona: r.ok ? r.data : null };
}

/** Vínculos (vigente e historial) y sueldo efectivo concepto a concepto, con el puesto elegido. */
export async function cargarLaboral(persona: PersonaDetalle, puestoId?: string) {
  const cargoId = persona.vinculoVigente?.cargoId;
  const [v, s, puestos] = await Promise.all([
    ejecutarComoUsuario<Vinculo[]>("erp", "core.vinculos.list", { personaId: persona.id }),
    ejecutarComoUsuario<SueldoEfectivo>("erp", "core.estructuras.efectiva", {
      personaId: persona.id,
      ...(puestoId ? { puestoId } : {}),
    }),
    cargoId
      ? ejecutarComoUsuario<PuestoDeCargo[]>("erp", "core.puestos.list", {
          cargoId,
          soloActivos: true,
        })
      : Promise.resolve(null),
  ]);
  return {
    vinculos: v.ok ? v.data : [],
    sueldo: s.ok ? s.data : null,
    sueldoBloqueado: !s.ok && s.error.code === "FORBIDDEN",
    puestos: puestos?.ok ? puestos.data : [],
  };
}
