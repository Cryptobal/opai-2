import { PERMISOS_CORE } from "@opai/domain";
import type { DefinicionImportador } from "@opai/domain/importacion";

import { bloquearNoAnonimizado } from "../maestros/anonimizado";
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
    const conPrincipal = new Set<string>();
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
        deLaCuenta.find((c) => (!email || !c.email) && norm(`${c.nombres} ${c.apellidos}`) === norm(etiqueta));
      // El id de origen no puede llevar la fila a un contacto de OTRA cuenta: se cambiaría a quien no corresponde.
      if (existente && existente.cuentaId !== r.cuenta.id)
        return { fila: f.fila, clave: `fila:${f.fila}`, etiqueta, accion: "error", mensajes: ["El id de origen ya pertenece a un contacto de otra cuenta. Revisa la cuenta o el id de esta fila."] };
      // Ley 21.719: un contacto anonimizado no admite escrituras, tampoco por una importación.
      if (existente?.anonimizadoEn)
        return { fila: f.fila, clave: `fila:${f.fila}`, etiqueta, accion: "error", mensajes: ["Este contacto fue anonimizado y no se puede volver a cargar."] };
      // La importación no le quita el lugar al contacto principal que la cuenta ya tiene.
      const yaHayPrincipal = deLaCuenta.some((c) => c.esPrincipal) || conPrincipal.has(r.cuenta.id);
      if (datos.esPrincipal && !existente && yaHayPrincipal) datos.esPrincipal = false;
      else if (datos.esPrincipal && !existente) conPrincipal.add(r.cuenta.id);
      const mensajes = [
        ...(desconocidos.length ? [`Roles no reconocidos, se ignoran: ${desconocidos.join(", ")}.`] : []),
        ...(f.datos["es_principal"] === true && !existente && !datos.esPrincipal ? ["La cuenta ya tiene contacto principal: este entra sin esa marca."] : []),
      ];
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
    // Mismo bloqueo que `core.contactos.update`: si se anonimiza entre el plan y la escritura, no se vuelve a llenar.
    await bloquearNoAnonimizado(tx, "contacto", id);
    await tx.contacto.update({ where: { id }, data: cambios });
  },
  actuales: (tx, ids) => tx.contacto.findMany({ where: { id: { in: [...ids] } } }),
  async bloqueos(tx, ids) {
    const filas = await tx.contacto.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, _count: { select: { negocioContactos: true, actividadVinculos: true, cuentaVinculos: true } } },
    });
    const con = filas.filter((c) => Object.values(c._count).some((n) => n > 0));
    return new Map(con.map((c) => [c.id, "está en negocios, actividades o vinculado a otra cuenta"]));
  },
  async borrar(tx, ids) {
    await tx.contacto.deleteMany({ where: { id: { in: [...ids] } } });
  },
};
