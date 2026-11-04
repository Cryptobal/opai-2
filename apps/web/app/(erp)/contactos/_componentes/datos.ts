import { cargarOpcionesEtiqueta, filtroEtiquetaDe } from "@/app/_components/etiquetas/opciones";
import type { EtiquetaDeFila } from "@/lib/tipos-etiquetas";
import { estadoPantalla } from "@/lib/formato";
import { requerirEncontrado, requerirUuid } from "@/lib/ids";
import { leerParametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

export type ContactoFila = {
  id: string;
  nombre: string;
  cuentaId: string;
  cuentaNombre: string;
  email: string | null;
  telefono: string | null;
  cargo: string | null;
  esPrincipal: boolean;
  negociosAbiertos: number;
  archivado: boolean;
  etiquetas: EtiquetaDeFila[];
};

export type ContactoDetalle = {
  id: string;
  cuentaId: string;
  nombres: string;
  apellidos: string;
  email: string | null;
  telefono: string | null;
  cargo: string | null;
  esPrincipal: boolean;
  roles: string[];
  estado: string;
  notas: string | null;
  archivadoEn: string | null;
};

type Lista = { items: ContactoFila[]; siguiente: string | null };

export async function cargarContactos(f: Record<string, string | undefined>) {
  const [r, etiquetas] = await Promise.all([
    ejecutarComoUsuario<Lista>("erp", "comercial.contactos.list", {
    limite: 100,
    ...filtroEtiquetaDe(f),
    ...(f["archivados"] === "si" ? { incluirArchivadas: true } : {}),
    ...(f["q"] ? { q: f["q"] } : {}),
    ...(f["principales"] === "si" ? { soloPrincipales: true } : {}),
    }),
    cargarOpcionesEtiqueta(),
  ]);
  return { state: estadoPantalla(r), items: r.ok ? r.data.items : [], etiquetas };
}

export async function cargarContacto(id: string) {
  const r = await ejecutarComoUsuario<ContactoDetalle>("erp", "core.contactos.get", {
    id: requerirUuid(id),
  });
  requerirEncontrado(r);
  return { state: estadoPantalla(r), contacto: r.ok ? r.data : null };
}

export const filtrosDe = leerParametros;
