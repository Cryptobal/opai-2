import { PERMISOS_CORE } from "@opai/domain";

import { datosSiHayPermiso } from "@/lib/carga";
import { estadoPantalla } from "@/lib/formato";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
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

/** Permiso efectivo para subir documentos y pedir renovaciones. */
export async function puedeGestionarDocumentos() {
  const id = await requerirIdentidad("/supervisor");
  return puedeDeIdentidad(id)(PERMISOS_CORE.documentosManage);
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
  const noEncontrada = !r.ok && r.error.code === "NOT_FOUND";
  if (!r.ok) return { state: estadoPantalla(r), noEncontrada, i: null, contacto: null };
  const c = await ejecutarComoUsuario<Contacto[]>(P, "core.contactos.list", {
    cuentaId: r.data.cuentaId,
  });
  // Sin permiso de contactos no hay a quién llamar; un fallo no se ve como «sin teléfono» (CAR-50).
  const lista = datosSiHayPermiso(c, []);
  const contacto = lista.find((x) => x.esPrincipal && x.telefono) ?? lista.find((x) => x.telefono);
  return { state: estadoPantalla(r), noEncontrada, i: r.data, contacto: contacto ?? null };
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
    // Los documentos también cuentan: un fallo no se ve como «sin documentos» (CAR-50).
    state: estadoPantalla(p, d),
    noEncontrada: !p.ok && p.error.code === "NOT_FOUND",
    p: p.ok ? p.data : null,
    docs: d.ok ? d.data.items : [],
    faltantes: d.ok ? d.data.faltantes : [],
  };
}
