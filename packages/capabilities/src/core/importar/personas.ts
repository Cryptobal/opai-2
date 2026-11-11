// Importador de personas y guardias (CAR-282) sobre el motor común: ficha, previsión y cuenta bancaria.
// Reglas: el RUT identifica a la persona (reimportar no duplica); la cuenta bancaria solo se carga si la
// persona no tiene una (un cambio de cuenta pasa por «Solicitar cambio» y la aprobación de RRHH); la
// previsión y el banco exigen además su propio permiso, fila por fila.
import { PERMISOS_CORE } from "@opai/domain";

import { cifrarCampoEnTransaccion } from "../cumplimiento/cifrado-campos";
import { prohibido } from "../../errores";
import { idsExternos, texto } from "./comun";
import {
  CAMPOS_FICHA,
  CAMPOS_PAGO,
  CAMPOS_PREVISION,
  datosDePersona,
  defPersonas,
  erroresDePersona,
  type DatosPersona,
} from "./personas-campos";
import { actualesPersonas, aplanar, bloqueosPersonas, guardarPago, guardarPrevision } from "./personas-escritura";
import type { FilaPlan, Importador } from "./tipos";

const tiene = (d: DatosPersona, campos: readonly (keyof DatosPersona)[]) => campos.some((k) => d[k] !== null);
const sinPago = { bancoCodigo: null, tipoCuenta: null, numeroCuenta: null };

export const importadorPersonas: Importador<DatosPersona> = {
  def: defPersonas,
  entidad: "persona",
  permiso: PERMISOS_CORE.personasManage,
  actualizables: [...CAMPOS_FICHA, ...CAMPOS_PREVISION, ...CAMPOS_PAGO],
  async planificar(ctx, filas, o) {
    const externos = await idsExternos(ctx, "persona", o.sistema, filas.map((f) => texto(f.datos["id_externo"]) ?? ""));
    const personas = await ctx.db.persona.findMany({ include: { prevision: true, pago: true } });
    const porId = new Map(personas.map((p) => [p.id, p]));
    const porRut = new Map(personas.map((p) => [p.rut, p]));
    const puedePrevision = ctx.autorizar(PERMISOS_CORE.personasPrevisionManage);
    const puedePago = ctx.autorizar(PERMISOS_CORE.personasPagoManage);
    const rutVisto = new Map<string, number>();
    return filas.map((f): FilaPlan<DatosPersona> => {
      const leidos = datosDePersona(f);
      const idExterno = texto(f.datos["id_externo"]);
      const etiqueta = `${leidos.nombres} ${leidos.apellidos}`.trim();
      const falla = (mensajes: string[]): FilaPlan<DatosPersona> => ({ fila: f.fila, clave: `fila:${f.fila}`, etiqueta, accion: "error", mensajes });
      const errores = erroresDePersona(f, leidos);
      if (tiene(leidos, CAMPOS_PREVISION) && !puedePrevision) errores.push("No tienes permiso para cargar la previsión: quita esas columnas o pide el acceso.");
      if (tiene(leidos, CAMPOS_PAGO) && !puedePago) errores.push("No tienes permiso para cargar cuentas bancarias: quita esas columnas o pide el acceso.");
      const repetido = rutVisto.get(leidos.rut);
      if (repetido !== undefined) errores.push(`El RUT se repite en la fila ${repetido}. Deja una sola fila por persona.`);
      else rutVisto.set(leidos.rut, f.fila);
      const deExterno = idExterno ? porId.get(externos.get(idExterno) ?? "") : undefined;
      const deRut = porRut.get(leidos.rut);
      if (deExterno && deExterno.rut !== leidos.rut) errores.push("El id de origen ya está ligado a otra persona, con otro RUT. Revisa la columna del id.");
      const existente = deRut ?? deExterno;
      if (existente?.archivadaEn || existente?.anonimizadaEn) errores.push("La persona existe pero está archivada o anonimizada: no se modifica desde una importación.");
      if (errores.length) return falla(errores);
      const base = { fila: f.fila, clave: `rut:${leidos.rut}`, etiqueta, idExterno };
      if (!existente) return { ...base, accion: "crear", mensajes: [], datos: leidos };
      // Con cuenta registrada, la importación no la toca aunque se pida sobrescribir.
      const conCuenta = !!existente.pago && tiene(leidos, CAMPOS_PAGO);
      return {
        ...base,
        accion: "actualizar",
        mensajes: conCuenta ? ["Ya tiene cuenta bancaria: no se cambia desde la importación (usa «Solicitar cambio» en su ficha)."] : [],
        datos: conCuenta ? { ...leidos, ...sinPago } : leidos,
        existente: aplanar(existente),
      };
    });
  },
  async crear(tx, ctx, d) {
    const { afp, regimen, sistemaSalud, isapreNombre, bancoCodigo, tipoCuenta, numeroCuenta, nacionalidad, ...ficha } = d;
    const p = await tx.persona.create({
      data: { ...ficha, ...(nacionalidad ? { nacionalidad } : {}), tenantId: ctx.tenantId },
      select: { id: true },
    });
    if (tiene(d, CAMPOS_PREVISION)) await guardarPrevision(tx, ctx.tenantId, p.id, { afp, regimen, sistemaSalud, isapreNombre });
    if (bancoCodigo && tipoCuenta && numeroCuenta) {
      const cifrado = await cifrarCampoEnTransaccion(ctx, tx, "personas_pago", "numero_cuenta", numeroCuenta);
      await guardarPago(tx, ctx.tenantId, p.id, { bancoCodigo, tipoCuenta, numeroCuenta: cifrado });
    }
    return p.id;
  },
  async actualizar(tx, id, cambios, ctx) {
    const parte = <K extends keyof DatosPersona>(campos: readonly K[]) =>
      Object.fromEntries(campos.filter((k) => k in cambios).map((k) => [k, cambios[k] ?? null])) as Partial<Pick<DatosPersona, K>>;
    const { nacionalidad, ...ficha } = parte(CAMPOS_FICHA);
    const datosFicha = { ...ficha, ...(nacionalidad ? { nacionalidad } : {}) };
    // Siempre se toca la persona: su `updatedAt` es la marca con que se revisa la reversión.
    await tx.persona.update({ where: { id }, data: { ...datosFicha, updatedAt: new Date() } });
    const prevision = parte(CAMPOS_PREVISION);
    const pago = parte(CAMPOS_PAGO);
    // También al revertir: restaurar la previsión o quitar una cuenta pide el permiso de esa sección.
    if (Object.keys(prevision).length && !ctx.autorizar(PERMISOS_CORE.personasPrevisionManage))
      throw prohibido("No tienes permiso para modificar la previsión de las personas de este lote.");
    if (Object.keys(pago).length && !ctx.autorizar(PERMISOS_CORE.personasPagoManage))
      throw prohibido("No tienes permiso para modificar las cuentas bancarias de las personas de este lote.");
    if (Object.keys(prevision).length) await guardarPrevision(tx, ctx.tenantId, id, prevision);
    if (!Object.keys(pago).length) return;
    // Al revertir vuelven los tres campos en null: la cuenta que creó el lote se elimina.
    if (!pago.bancoCodigo || !pago.tipoCuenta || !pago.numeroCuenta) {
      await tx.personaPago.deleteMany({ where: { personaId: id } });
      return;
    }
    const cifrado = await cifrarCampoEnTransaccion(ctx, tx, "personas_pago", "numero_cuenta", pago.numeroCuenta);
    await guardarPago(tx, ctx.tenantId, id, { bancoCodigo: pago.bancoCodigo, tipoCuenta: pago.tipoCuenta, numeroCuenta: cifrado });
  },
  actuales: actualesPersonas,
  bloqueos: bloqueosPersonas,
  async borrar(tx, ids) {
    await tx.persona.deleteMany({ where: { id: { in: [...ids] } } });
  },
};
