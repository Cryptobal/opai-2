import { PERMISOS_CORE } from "@opai/domain";
import type { DefinicionImportador } from "@opai/domain/importacion";

import { CAMPOS_CUENTA, CAMPO_ID_EXTERNO, fecha, idsExternos, norm, resolverCuentas, texto } from "./comun";
import type { FilaPlan, Importador } from "./tipos";

export type DatosInstalacion = {
  cuentaId: string; nombre: string; estado: string; calle: string | null; comuna: string | null;
  region: string | null; lat: number | null; lng: number | null; vigenteDesde: Date | null; notas: string | null;
};

const def: DefinicionImportador = {
  id: "instalaciones",
  etiqueta: "Instalaciones",
  descripcion: "Lugares donde se presta el servicio, por cuenta. Se reconocen por su nombre dentro de la cuenta.",
  campos: [
    CAMPO_ID_EXTERNO,
    ...CAMPOS_CUENTA,
    { clave: "nombre", etiqueta: "Nombre", tipo: "texto", requerido: true, sinonimos: ["name", "instalacion", "instalación", "sucursal", "sede"], ejemplo: "Bodega Quilicura", largoMaximo: 200 },
    { clave: "estado", etiqueta: "Estado", tipo: "opcion", sinonimos: ["status"], ejemplo: "activa",
      opciones: { prospecto: ["prospect"], activa: ["active", "activo", "vigente"], inactiva: ["inactive", "inactivo", "terminada"] } },
    { clave: "calle", etiqueta: "Dirección", tipo: "texto", sinonimos: ["direccion", "address", "domicilio"], ejemplo: "Camino Lo Echevers 550", largoMaximo: 200 },
    { clave: "comuna", etiqueta: "Comuna", tipo: "texto", sinonimos: ["commune"], ejemplo: "Quilicura", largoMaximo: 80 },
    { clave: "region", etiqueta: "Región", tipo: "texto", ejemplo: "Metropolitana", largoMaximo: 80 },
    { clave: "lat", etiqueta: "Latitud", tipo: "decimal", sinonimos: ["latitude"], ejemplo: "-33,3601" },
    { clave: "lng", etiqueta: "Longitud", tipo: "decimal", sinonimos: ["lon", "long", "longitude"], ejemplo: "-70,7286" },
    { clave: "vigente_desde", etiqueta: "Vigente desde", tipo: "fecha", sinonimos: ["inicio", "startDate"], ejemplo: "01-03-2024" },
    { clave: "notas", etiqueta: "Notas", tipo: "texto", sinonimos: ["observaciones", "notes"], ejemplo: "", largoMaximo: 2000 },
  ],
};

const coordenada = (v: unknown, max: number): number | null => (typeof v === "number" && Math.abs(v) <= max ? v : null);

export const importadorInstalaciones: Importador<DatosInstalacion> = {
  def,
  entidad: "instalacion",
  permiso: PERMISOS_CORE.instalacionesManage,
  actualizables: ["calle", "comuna", "region", "lat", "lng", "vigenteDesde", "notas"],
  async planificar(ctx, filas, o) {
    const cuentaDe = await resolverCuentas(ctx, filas, o.sistema);
    const externos = await idsExternos(ctx, "instalacion", o.sistema, filas.map((f) => texto(f.datos["id_externo"]) ?? ""));
    const resueltas = filas.map((f) => ({ f, r: cuentaDe(f) }));
    const cuentaIds = [...new Set(resueltas.flatMap((x) => ("cuenta" in x.r ? [x.r.cuenta.id] : [])))];
    const existentes = await ctx.db.instalacion.findMany({
      where: { OR: [{ cuentaId: { in: cuentaIds } }, { id: { in: [...externos.values()] } }] },
    });
    const porId = new Map(existentes.map((i) => [i.id, i]));
    return resueltas.map(({ f, r }): FilaPlan<DatosInstalacion> => {
      const nombre = texto(f.datos["nombre"]) ?? "";
      const idExterno = texto(f.datos["id_externo"]);
      if ("error" in r) return { fila: f.fila, clave: `fila:${f.fila}`, etiqueta: nombre, accion: "error", mensajes: [r.error] };
      const lat = coordenada(f.datos["lat"], 90);
      const lng = coordenada(f.datos["lng"], 180);
      const ambas = lat !== null && lng !== null;
      const datos: DatosInstalacion = {
        cuentaId: r.cuenta.id, nombre, estado: texto(f.datos["estado"]) ?? "prospecto", calle: texto(f.datos["calle"]),
        comuna: texto(f.datos["comuna"]), region: texto(f.datos["region"]), lat: ambas ? lat : null, lng: ambas ? lng : null,
        vigenteDesde: fecha(f.datos["vigente_desde"]), notas: texto(f.datos["notas"]),
      };
      const traeCoordenada = f.datos["lat"] !== null || f.datos["lng"] !== null;
      const mensajes = traeCoordenada && !ambas ? ["Coordenadas incompletas o fuera de rango: se importa sin ubicación en el mapa."] : [];
      // El nombre es único por cuenta en la base, así que manda sobre el id externo al buscar el existente.
      const existente =
        existentes.find((i) => i.cuentaId === r.cuenta.id && norm(i.nombre) === norm(nombre)) ??
        (idExterno ? porId.get(externos.get(idExterno) ?? "") : undefined);
      return {
        fila: f.fila, clave: `${r.cuenta.id}|${norm(nombre)}`, etiqueta: `${nombre} · ${r.cuenta.nombre}`,
        accion: existente ? "actualizar" : "crear", mensajes, datos, idExterno, ...(existente ? { existente } : {}),
      };
    });
  },
  async crear(tx, ctx, datos) {
    return (await tx.instalacion.create({ data: { ...datos, tenantId: ctx.tenantId }, select: { id: true } })).id;
  },
  async actualizar(tx, id, { cuentaId: _cuenta, ...cambios }) {
    await tx.instalacion.update({ where: { id }, data: cambios });
  },
  actuales: (tx, ids) => tx.instalacion.findMany({ where: { id: { in: [...ids] } } }),
  async bloqueos(tx, ids) {
    const filas = await tx.instalacion.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, _count: { select: { puestos: true, negocioInstalaciones: true, vinculos: true, estructuras: true, supervisores: true, actividadVinculos: true } } },
    });
    const con = filas.filter((i) => Object.values(i._count).some((n) => n > 0));
    return new Map(con.map((i) => [i.id, "tiene puestos, negocios, personas, supervisores u otros datos asociados"]));
  },
  async borrar(tx, ids) {
    await tx.instalacion.deleteMany({ where: { id: { in: [...ids] } } });
  },
};
