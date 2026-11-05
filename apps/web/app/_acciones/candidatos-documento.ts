"use server";

import { z } from "zod";

import { ejecutarComoUsuario } from "@/lib/servidor";

const entrada = z.object({
  tipo: z.enum(["cuenta", "instalacion", "persona"]),
  q: z.string().trim().max(120),
});

export type Candidato = { id: string; etiqueta: string; detalle?: string };
/** `hayMas`: la lista llegó al tope y puede haber más coincidencias (hay que refinar). */
export type Candidatos =
  { ok: true; items: Candidato[]; hayMas?: true } | { ok: false; mensaje: string };

const MAXIMO = 20;
/** Mínimo de caracteres para buscar personas: cada consulta es una lectura auditada. */
const MINIMO_PERSONA = 2;
const MENSAJE_FALLO = "No se pudo buscar. Reintenta en unos segundos.";

type Tipo = z.infer<typeof entrada>["tipo"];

type Fila = {
  id: string;
  nombre?: string;
  nombres?: string;
  apellidos?: string;
  cuenta?: string | null;
};

function aCandidato(tipo: Tipo, f: Fila): Candidato {
  if (tipo === "persona") {
    const partes = [f.apellidos, f.nombres].map((x) => x?.trim() ?? "").filter(Boolean);
    return { id: f.id, etiqueta: partes.join(", ") };
  }
  return {
    id: f.id,
    etiqueta: f.nombre ?? "",
    ...(tipo === "instalacion" && f.cuenta ? { detalle: f.cuenta } : {}),
  };
}

/**
 * Candidatos del selector «Vincular a» del explorador de Documentos: lee con las capacidades de
 * listar de cuentas, instalaciones y personas (permiso y alcance se aplican en la consulta) y deja
 * pasar solo id y nombre, nunca el RUT ni otro dato personal. A qué entidad se puede vincular lo
 * decide `core.documentos.iniciar_subida`, no esta búsqueda.
 */
export async function buscarCandidatosDocumento(
  input: z.input<typeof entrada>,
): Promise<Candidatos> {
  const e = entrada.safeParse(input);
  if (!e.success) return { ok: false, mensaje: MENSAJE_FALLO };
  const { tipo, q } = e.data;
  if (tipo === "persona" && q.length > 0 && q.length < MINIMO_PERSONA)
    return { ok: true, items: [] };
  const filtro = { limite: MAXIMO, ...(q ? { q } : {}) };
  // Ids literales: el gate de paridad rastrea qué capacidades invoca cada entrada de servidor.
  const r =
    tipo === "cuenta"
      ? await ejecutarComoUsuario<{ items: Fila[] }>("erp", "core.cuentas.list", filtro)
      : tipo === "instalacion"
        ? await ejecutarComoUsuario<{ items: Fila[] }>("erp", "core.instalaciones.list", filtro)
        : await ejecutarComoUsuario<{ items: Fila[] }>("erp", "core.personas.list", filtro);
  if (!r.ok) {
    const mensaje =
      r.error.code === "FORBIDDEN" ? "No tienes permiso para ver esta lista." : MENSAJE_FALLO;
    return { ok: false, mensaje };
  }
  const items = r.data.items.slice(0, MAXIMO).map((f) => aCandidato(tipo, f));
  return { ok: true, items, ...(r.data.items.length >= MAXIMO ? { hayMas: true as const } : {}) };
}
