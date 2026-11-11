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
  actualizables: ["razonSocial", "rut", "giro", "estado", "sitioWeb", "calle", "comuna", "ciudad", "region", "emailDte", "notas", "clienteDesde"],
  // «Prospecto» es el estado por defecto: una cuenta activa en el origen queda activa aquí (Carlos, 11-nov-2026)
  // y una planilla que dice «prospecto» nunca baja a un cliente.
  sinDato: { estado: "prospecto" },
  async planificar(ctx, filas, o) {
    const externos = await idsExternos(ctx, "cuenta", o.sistema, filas.map((f) => texto(f.datos["id_externo"]) ?? ""));
    // Incluye las archivadas: el RUT es único en toda la empresa, también entre ellas.
    const cuentas = await ctx.db.cuenta.findMany();
    const porId = new Map(cuentas.map((c) => [c.id, c]));
    const porRut = new Map(cuentas.filter((c) => c.rut).map((c) => [c.rut ?? "", c]));
    const porNombre = new Map<string, typeof cuentas>();
    for (const c of cuentas.filter((x) => !x.archivadaEn)) porNombre.set(norm(c.nombre), [...(porNombre.get(norm(c.nombre)) ?? []), c]);
    const rutVisto = new Map<string, number>();
    return filas.map((f): FilaPlan<DatosCuenta> => {
      const datos = datosDe(f);
      const idExterno = texto(f.datos["id_externo"]);
      const clave = idExterno ? `ext:${idExterno}` : datos.rut ? `rut:${datos.rut}` : `nombre:${norm(datos.nombre)}`;
      const base = { fila: f.fila, clave, etiqueta: datos.nombre, idExterno, datos };
      const deExterno = idExterno ? porId.get(externos.get(idExterno) ?? "") : undefined;
      const deRut = datos.rut ? porRut.get(datos.rut) : undefined;
      const falla = (m: string): FilaPlan<DatosCuenta> => ({ ...base, clave: `fila:${f.fila}`, accion: "error", mensajes: [m] });
      if (deExterno && deRut && deRut.id !== deExterno.id) return falla(`El RUT ya pertenece a otra cuenta (${deRut.nombre}).`);
      if (deExterno?.rut && datos.rut && deExterno.rut !== datos.rut)
        return falla(`El id de origen ya está ligado a «${deExterno.nombre}», que tiene otro RUT. Revisa la columna del id.`);
      const repetido = datos.rut ? rutVisto.get(datos.rut) : undefined;
      if (repetido !== undefined) return falla(`El RUT se repite en la fila ${repetido}. Deja una sola fila por RUT.`);
      if (datos.rut) rutVisto.set(datos.rut, f.fila);
      if ((deExterno ?? deRut)?.archivadaEn) return falla("La cuenta existe pero está archivada: restáurala o quítala de la planilla.");
      const homonimas = porNombre.get(norm(datos.nombre)) ?? [];
      if (!deExterno && !deRut && !datos.rut && homonimas.length > 1) return falla(`Hay ${homonimas.length} cuentas llamadas «${datos.nombre}»: indica el RUT.`);
      const deNombre = homonimas[0];
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
  actuales: (tx, ids) => tx.cuenta.findMany({ where: { id: { in: [...ids] } } }),
  async bloqueos(tx, ids) {
    const filas = await tx.cuenta.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, _count: { select: { contactos: true, contactoVinculos: true, instalaciones: true, negocios: true, representantes: true, referencias: true, actividadVinculos: true } } },
    });
    const con = filas.filter((c) => Object.values(c._count).some((n) => n > 0));
    return new Map(con.map((c) => [c.id, "tiene contactos, instalaciones, negocios u otros datos asociados"]));
  },
  async borrar(tx, ids) {
    await tx.cuenta.deleteMany({ where: { id: { in: [...ids] } } });
  },
};
