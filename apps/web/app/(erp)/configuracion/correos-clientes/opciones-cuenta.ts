import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

export type Opcion = { valor: string; etiqueta: string };
type Contacto = { contactoId: string; nombres: string; apellidos: string; email: string | null };

/** Contactos y negocios de una cuenta como opciones de lista; lo que no se pueda leer queda vacío. */
export async function opcionesDeCuenta(cuentaId: string): Promise<{ contactos: Opcion[]; negocios: Opcion[] }> {
  const [c, negocios] = await Promise.all([
    ejecutarCapacidad("erp", "core.cuentas.contactos", { cuentaId }).catch(() => null),
    todosLosNegocios(cuentaId),
  ]);
  return {
    contactos: c?.ok
      ? (c.data as Contacto[]).map((x) => ({
          valor: x.contactoId,
          etiqueta: `${x.nombres} ${x.apellidos}`.trim() + (x.email ? ` · ${x.email}` : ""),
        }))
      : [],
    negocios,
  };
}

type PaginaNegocios = { items: { id: string; titulo: string }[]; siguiente: string | null };
const MAX_PAGINAS = 10;

/** Recorre las páginas de negocios de la cuenta (hasta 1.000) para que ninguno quede fuera del selector. */
async function todosLosNegocios(cuentaId: string): Promise<Opcion[]> {
  const out: Opcion[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < MAX_PAGINAS; i++) {
    const r = await ejecutarCapacidad("erp", "comercial.negocios.list", { cuentaId, limite: 100, ...(cursor ? { cursor } : {}) }).catch(() => null);
    if (!r?.ok) break;
    const d = r.data as PaginaNegocios;
    out.push(...d.items.map((x) => ({ valor: x.id, etiqueta: x.titulo })));
    if (!d.siguiente) break;
    cursor = d.siguiente;
  }
  return out;
}
