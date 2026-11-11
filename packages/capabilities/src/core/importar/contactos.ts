import { PERMISOS_CORE } from "@opai/domain";
import type { DefinicionImportador } from "@opai/domain/importacion";

import { ROLES_CONTACTO, unicoPrincipal } from "../maestros/contactos-vista";
import { CAMPOS_CUENTA, CAMPO_ID_EXTERNO, idsExternos, norm, resolverCuentas, texto } from "./comun";
import type { FilaPlan, Importador } from "./tipos";

export type DatosContacto = {
  cuentaId: string; nombres: string; apellidos: string; email: string | null; telefono: string | null;
  cargo: string | null; esPrincipal: boolean; roles: readonly string[]; notas: string | null;
};

const def: DefinicionImportador = {
  id: "contactos",
  etiqueta: "Contactos",
  descripcion: "Personas de contacto de cada cuenta. Se reconocen por su correo dentro de la cuenta; sin correo, por nombre y apellido.",
  campos: [
    CAMPO_ID_EXTERNO,
    ...CAMPOS_CUENTA,
    { clave: "nombres", etiqueta: "Nombres", tipo: "texto", requerido: true, sinonimos: ["nombre", "firstName", "first name"], ejemplo: "María", largoMaximo: 120 },
    { clave: "apellidos", etiqueta: "Apellidos", tipo: "texto", sinonimos: ["apellido", "lastName", "last name"], ejemplo: "Pérez Soto", largoMaximo: 120 },
    { clave: "email", etiqueta: "Correo", tipo: "email", sinonimos: ["e-mail", "mail", "correo electronico"], ejemplo: "maria.perez@acme.cl" },
    { clave: "telefono", etiqueta: "Teléfono", tipo: "telefono", sinonimos: ["phone", "celular", "movil", "fono"], ejemplo: "+56 9 8765 4321" },
    { clave: "cargo", etiqueta: "Cargo", tipo: "texto", sinonimos: ["roleTitle", "puesto", "title"], ejemplo: "Jefa de Operaciones", largoMaximo: 120 },
    { clave: "es_principal", etiqueta: "Contacto principal", tipo: "booleano", sinonimos: ["isPrimary", "principal"], ejemplo: "sí" },
    { clave: "roles", etiqueta: "Roles", tipo: "texto", ejemplo: "facturacion, cobranza", ayuda: `Separados por coma: ${ROLES_CONTACTO.join(", ")}.`, largoMaximo: 120 },
    { clave: "notas", etiqueta: "Notas", tipo: "texto", sinonimos: ["observaciones", "notes"], ejemplo: "", largoMaximo: 2000 },
  ],
};

/** Roles válidos de la lista escrita en la celda; los que no existen se informan sin frenar la fila. */
function rolesDe(celda: string | null): { roles: string[]; desconocidos: string[] } {
  const pedidos = (celda ?? "").split(/[,;/|]/).map(norm).filter(Boolean);
  const validos: readonly string[] = ROLES_CONTACTO;
  return { roles: [...new Set(pedidos.filter((r) => validos.includes(r)))], desconocidos: pedidos.filter((r) => !validos.includes(r)) };
}

export const importadorContactos: Importador<DatosContacto> = {
  def,
  entidad: "contacto",
  permiso: PERMISOS_CORE.cuentasManage,
  actualizables: ["apellidos", "email", "telefono", "cargo", "notas"],
  async planificar(ctx, filas, o) {
    const cuentaDe = await resolverCuentas(ctx, filas, o.sistema);
    const externos = await idsExternos(ctx, "contacto", o.sistema, filas.map((f) => texto(f.datos["id_externo"]) ?? ""));
    const resueltas = filas.map((f) => ({ f, r: cuentaDe(f) }));
    const cuentaIds = [...new Set(resueltas.flatMap((x) => ("cuenta" in x.r ? [x.r.cuenta.id] : [])))];
    const contactos = cuentaIds.length ? await ctx.db.contacto.findMany({ where: { cuentaId: { in: cuentaIds }, archivadoEn: null } }) : [];
    const deExternos = externos.size ? await ctx.db.contacto.findMany({ where: { id: { in: [...externos.values()] } } }) : [];
    const porId = new Map([...contactos, ...deExternos].map((c) => [c.id, c]));
    return resueltas.map(({ f, r }): FilaPlan<DatosContacto> => {
      const nombres = texto(f.datos["nombres"]) ?? "";
      const apellidos = texto(f.datos["apellidos"]) ?? "";
      const email = texto(f.datos["email"]);
      const idExterno = texto(f.datos["id_externo"]);
      const etiqueta = `${nombres} ${apellidos}`.trim();
      if ("error" in r) return { fila: f.fila, clave: `fila:${f.fila}`, etiqueta, accion: "error", mensajes: [r.error] };
      const { roles, desconocidos } = rolesDe(texto(f.datos["roles"]));
      const datos: DatosContacto = {
        cuentaId: r.cuenta.id, nombres, apellidos, email, telefono: texto(f.datos["telefono"]),
        cargo: texto(f.datos["cargo"]), esPrincipal: f.datos["es_principal"] === true, roles, notas: texto(f.datos["notas"]),
      };
      const propia = idExterno ? `ext:${idExterno}` : email ? `correo:${email}` : `nombre:${norm(etiqueta)}`;
      const deLaCuenta = contactos.filter((c) => c.cuentaId === r.cuenta.id);
      const existente =
        (idExterno ? porId.get(externos.get(idExterno) ?? "") : undefined) ??
        (email ? deLaCuenta.find((c) => c.email?.toLowerCase() === email) : undefined) ??
        deLaCuenta.find((c) => !email && norm(`${c.nombres} ${c.apellidos}`) === norm(etiqueta));
      const mensajes = desconocidos.length ? [`Roles no reconocidos, se ignoran: ${desconocidos.join(", ")}.`] : [];
      return {
        fila: f.fila, clave: `${r.cuenta.id}|${propia}`, etiqueta: `${etiqueta} · ${r.cuenta.nombre}`,
        accion: existente ? "actualizar" : "crear", mensajes, datos, idExterno, ...(existente ? { existente } : {}),
      };
    });
  },
  async crear(tx, ctx, datos) {
    const c = await tx.contacto.create({
      data: { ...datos, roles: [...datos.roles], estado: "activo", tenantId: ctx.tenantId },
      select: { id: true, cuentaId: true, esPrincipal: true },
    });
    if (c.esPrincipal) await unicoPrincipal(tx, c.cuentaId, c.id);
    return c.id;
  },
  async actualizar(tx, id, { roles: _roles, cuentaId: _cuenta, ...cambios }) {
    await tx.contacto.update({ where: { id }, data: cambios });
  },
  actual: (tx, id) => tx.contacto.findFirst({ where: { id } }),
  async bloqueoAlBorrar(tx, id) {
    const c = await tx.contacto.findFirst({
      where: { id },
      select: { _count: { select: { negocioContactos: true, actividadVinculos: true } } },
    });
    return c && c._count.negocioContactos + c._count.actividadVinculos > 0 ? "está en negocios o actividades" : null;
  },
  async borrar(tx, id) {
    await tx.contactoCuenta.deleteMany({ where: { contactoId: id } });
    await tx.contacto.delete({ where: { id } });
  },
};
