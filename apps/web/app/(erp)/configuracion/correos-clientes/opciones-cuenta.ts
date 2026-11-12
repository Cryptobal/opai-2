import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

export type Opcion = { valor: string; etiqueta: string };
type Contacto = { contactoId: string; nombres: string; apellidos: string; email: string | null };

/** Contactos y negocios de una cuenta como opciones de lista; lo que no se pueda leer queda vacío. */
export async function opcionesDeCuenta(cuentaId: string): Promise<{ contactos: Opcion[]; negocios: Opcion[] }> {
  const [c, n] = await Promise.all([
    ejecutarCapacidad("erp", "core.cuentas.contactos", { cuentaId }).catch(() => null),
    ejecutarCapacidad("erp", "comercial.negocios.list", { cuentaId, limite: 50 }).catch(() => null),
  ]);
  return {
    contactos: c?.ok
      ? (c.data as Contacto[]).map((x) => ({
          valor: x.contactoId,
          etiqueta: `${x.nombres} ${x.apellidos}`.trim() + (x.email ? ` · ${x.email}` : ""),
        }))
      : [],
    negocios: n?.ok
      ? (n.data as { items: { id: string; titulo: string }[] }).items.map((x) => ({ valor: x.id, etiqueta: x.titulo }))
      : [],
  };
}
