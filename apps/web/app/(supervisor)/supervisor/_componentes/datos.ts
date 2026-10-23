import { esRol, PERMISOS_CORE, tienePermiso } from "@opai/domain";

import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";
import type {
  Contacto,
  InstalacionDetalle,
  InstalacionFila,
  Pagina,
  PersonaDetalle,
} from "@/lib/tipos-maestros";

import type { Documento } from "@/app/_components/documentos/tipos";

const P = "supervisor";

/** Si el rol del usuario permite subir documentos y pedir renovaciones (documentos.manage). */
export async function puedeGestionarDocumentos() {
  const id = await requerirIdentidad("/supervisor");
  const rol = id.actual?.rol;
  return Boolean(rol && esRol(rol) && tienePermiso(rol, PERMISOS_CORE.documentosManage));
}

export async function instalacionesActivas() {
  const r = await ejecutarComoUsuario<Pagina<InstalacionFila>>(P, "core.instalaciones.list", {
    limite: 100,
    estado: "activa",
  });
  return { state: estadoPantalla(r), items: r.ok ? r.data.items : [] };
}

/** Instalación con el contacto principal de su cuenta (para llamar al cliente). */
export async function instalacionTerreno(id: string) {
  const r = await ejecutarComoUsuario<InstalacionDetalle>(P, "core.instalaciones.get", { id });
  if (!r.ok) return { state: estadoPantalla(r), i: null, contacto: null };
  const c = await ejecutarComoUsuario<Contacto[]>(P, "core.contactos.list", {
    cuentaId: r.data.cuentaId,
  });
  const lista = c.ok ? c.data : [];
  const contacto = lista.find((x) => x.esPrincipal && x.telefono) ?? lista.find((x) => x.telefono);
  return { state: estadoPantalla(r), i: r.data, contacto: contacto ?? null };
}

/** Persona con sus documentos y obligatorios faltantes. */
export async function personaTerreno(id: string) {
  const [p, d] = await Promise.all([
    ejecutarComoUsuario<PersonaDetalle>(P, "core.personas.get", { id }),
    ejecutarComoUsuario<{ items: Documento[]; faltantes: { tipoId: string; nombre: string }[] }>(
      P,
      "core.documentos.list",
      { entidad: { tipo: "persona", id } },
    ),
  ]);
  return {
    state: estadoPantalla(p),
    p: p.ok ? p.data : null,
    docs: d.ok ? d.data.items : [],
    faltantes: d.ok ? d.data.faltantes : [],
  };
}
