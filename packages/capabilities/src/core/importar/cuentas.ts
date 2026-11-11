import { PERMISOS_CORE } from "@opai/domain";
import type { DefinicionImportador, FilaNormalizada } from "@opai/domain/importacion";

import { CAMPO_ID_EXTERNO, fecha, idsExternos, norm, texto } from "./comun";
import type { FilaPlan, Importador } from "./tipos";

export type DatosCuenta = {
  nombre: string; razonSocial: string | null; rut: string | null; giro: string | null; estado: string;
  sitioWeb: string | null; calle: string | null; comuna: string | null; ciudad: string | null;
  region: string | null; emailDte: string | null; notas: string | null; clienteDesde: Date | null;
};

const def: DefinicionImportador = {
  id: "cuentas",
  etiqueta: "Cuentas",
  descripcion: "Clientes y prospectos. Se reconocen por RUT; sin RUT, por nombre exacto.",
  campos: [
    CAMPO_ID_EXTERNO,
    { clave: "nombre", etiqueta: "Nombre", tipo: "texto", requerido: true, sinonimos: ["name", "nombre fantasia", "nombre de fantasía", "cliente", "empresa", "cuenta"], ejemplo: "Acme", largoMaximo: 200 },
    { clave: "razon_social", etiqueta: "Razón social", tipo: "texto", sinonimos: ["legalName", "legal name"], ejemplo: "Acme SpA", largoMaximo: 200 },
    { clave: "rut", etiqueta: "RUT", tipo: "rut", sinonimos: ["rut empresa", "rut cliente", "tax id"], ejemplo: "76.543.210-3" },
    { clave: "giro", etiqueta: "Giro", tipo: "texto", sinonimos: ["actividad"], ejemplo: "Servicios logísticos", largoMaximo: 200 },
    { clave: "estado", etiqueta: "Estado", tipo: "opcion", sinonimos: ["status", "tipo"], ejemplo: "cliente activo",
      opciones: { prospecto: ["prospect", "prospecto"], cliente_activo: ["client_active", "cliente", "activo", "cliente activo", "client"], cliente_inactivo: ["client_inactive", "inactivo", "cliente inactivo"] } },
    { clave: "sitio_web", etiqueta: "Sitio web", tipo: "texto", sinonimos: ["web", "website", "url"], ejemplo: "acme.cl", largoMaximo: 200 },
    { clave: "calle", etiqueta: "Dirección", tipo: "texto", sinonimos: ["direccion", "address", "domicilio"], ejemplo: "Av. Apoquindo 1234", largoMaximo: 200 },
    { clave: "comuna", etiqueta: "Comuna", tipo: "texto", sinonimos: ["commune"], ejemplo: "Las Condes", largoMaximo: 80 },
    { clave: "ciudad", etiqueta: "Ciudad", tipo: "texto", sinonimos: ["city"], ejemplo: "Santiago", largoMaximo: 80 },
    { clave: "region", etiqueta: "Región", tipo: "texto", ejemplo: "Metropolitana", largoMaximo: 80 },
    { clave: "email_dte", etiqueta: "Correo de intercambio DTE", tipo: "email", sinonimos: ["emailDte", "correo dte", "casilla dte"], ejemplo: "dte@acme.cl" },
    { clave: "cliente_desde", etiqueta: "Cliente desde", tipo: "fecha", sinonimos: ["startDate", "inicio"], ejemplo: "01-03-2024" },
    { clave: "notas", etiqueta: "Notas", tipo: "texto", sinonimos: ["observaciones", "notes"], ejemplo: "", largoMaximo: 2000 },
  ],
};

const datosDe = (f: FilaNormalizada): DatosCuenta => ({
  nombre: texto(f.datos["nombre"]) ?? "",
  razonSocial: texto(f.datos["razon_social"]),
  rut: texto(f.datos["rut"]),
  giro: texto(f.datos["giro"]),
  estado: texto(f.datos["estado"]) ?? "prospecto",
  sitioWeb: texto(f.datos["sitio_web"]),
  calle: texto(f.datos["calle"]),
  comuna: texto(f.datos["comuna"]),
  ciudad: texto(f.datos["ciudad"]),
  region: texto(f.datos["region"]),
  emailDte: texto(f.datos["email_dte"]),
  notas: texto(f.datos["notas"]),
  clienteDesde: fecha(f.datos["cliente_desde"]),
});

export const importadorCuentas: Importador<DatosCuenta> = {
  def,
  entidad: "cuenta",
  permiso: PERMISOS_CORE.cuentasManage,
  actualizables: ["razonSocial", "rut", "giro", "sitioWeb", "calle", "comuna", "ciudad", "region", "emailDte", "notas", "clienteDesde"],
  async planificar(ctx, filas, o) {
    const externos = await idsExternos(ctx, "cuenta", o.sistema, filas.map((f) => texto(f.datos["id_externo"]) ?? ""));
    const cuentas = await ctx.db.cuenta.findMany({ where: { archivadaEn: null } });
    const porId = new Map(cuentas.map((c) => [c.id, c]));
    const porRut = new Map(cuentas.filter((c) => c.rut).map((c) => [c.rut ?? "", c]));
    const porNombre = new Map(cuentas.map((c) => [norm(c.nombre), c]));
    return filas.map((f): FilaPlan<DatosCuenta> => {
      const datos = datosDe(f);
      const idExterno = texto(f.datos["id_externo"]);
      const clave = idExterno ? `ext:${idExterno}` : datos.rut ? `rut:${datos.rut}` : `nombre:${norm(datos.nombre)}`;
      const base = { fila: f.fila, clave, etiqueta: datos.nombre, idExterno, datos };
      const deExterno = idExterno ? porId.get(externos.get(idExterno) ?? "") : undefined;
      const deRut = datos.rut ? porRut.get(datos.rut) : undefined;
      if (deExterno && deRut && deRut.id !== deExterno.id)
        return { ...base, accion: "error", mensajes: [`El RUT ya pertenece a otra cuenta (${deRut.nombre}).`] };
      const deNombre = porNombre.get(norm(datos.nombre));
      // Mismo nombre con otro RUT es otra empresa (matriz y filial): no se fusionan solas.
      const porNombreSeguro = deNombre && (!datos.rut || !deNombre.rut) ? deNombre : undefined;
      const existente = deExterno ?? deRut ?? porNombreSeguro;
      if (existente) return { ...base, accion: "actualizar", mensajes: [], existente };
      const aviso = deNombre ? [`Ya existe otra cuenta llamada «${deNombre.nombre}» con un RUT distinto; se crea una nueva.`] : [];
      return { ...base, accion: "crear", mensajes: aviso };
    });
  },
  async crear(tx, ctx, datos) {
    return (await tx.cuenta.create({ data: { ...datos, tenantId: ctx.tenantId }, select: { id: true } })).id;
  },
  async actualizar(tx, id, cambios) {
    await tx.cuenta.update({ where: { id }, data: cambios });
  },
  actual: (tx, id) => tx.cuenta.findFirst({ where: { id } }),
  async bloqueoAlBorrar(tx, id) {
    const c = await tx.cuenta.findFirst({
      where: { id },
      select: { _count: { select: { contactos: true, instalaciones: true, negocios: true } } },
    });
    const n = c ? c._count.contactos + c._count.instalaciones + c._count.negocios : 0;
    return n > 0 ? "tiene contactos, instalaciones o negocios" : null;
  },
  async borrar(tx, id) {
    await tx.cuenta.delete({ where: { id } });
  },
};
