// Importador de contratos vigentes (CAR-282, PR 2) sobre el motor común. Una fila es un vínculo laboral.
// Reglas: la persona se reconoce por RUT y debe existir; el contrato se reconoce por persona + fecha de
// inicio (reimportar no lo duplica); solo puede haber un contrato vigente por persona; el cargo y la
// instalación de un contrato ya cargado no se cambian desde la importación (eso es un anexo).
import { PERMISOS_CORE } from "@opai/domain";

import { exigirEdicionVinculo } from "../maestros/vinculos-validacion";
import { norm } from "./comun";
import { defContratos, erroresDeContrato, leerContrato, type DatosContrato, type Leidos } from "./contratos-campos";
import type { FilaPlan, Importador } from "./tipos";

const dia = (d: Date) => d.toISOString().slice(0, 10);
const estadoDe = (termino: Date | null, hoy: Date) => (termino && termino < hoy ? "terminado" : "vigente");

export const importadorContratos: Importador<DatosContrato> = {
  def: defContratos,
  entidad: "contrato",
  permiso: PERMISOS_CORE.vinculosManage,
  actualizables: ["tipo", "horasSemanales", "distribucion", "termino"],
  async planificar(ctx, filas) {
    // Igual que el alta manual: el contrato lo modifican solo owner y admin.
    exigirEdicionVinculo(ctx);
    const hoyTexto = new Date().toISOString().slice(0, 10);
    const hoy = new Date(`${hoyTexto}T00:00:00.000Z`);
    const leidas = filas.map((f) => ({ f, l: leerContrato(f) }));
    const ruts = [...new Set(leidas.map((x) => x.l.rut))];
    const personas = await ctx.db.persona.findMany({ where: { rut: { in: ruts } }, select: { id: true, rut: true, archivadaEn: true, anonimizadaEn: true } });
    const porRut = new Map(personas.map((p) => [p.rut, p]));
    const cargos = await ctx.db.cargo.findMany({ where: { activo: true }, select: { id: true, nombre: true } });
    const instalaciones = await ctx.db.instalacion.findMany({ where: { archivadaEn: null }, select: { id: true, nombre: true, cuenta: { select: { nombre: true, rut: true } } } });
    const vinculos = await ctx.db.vinculoLaboral.findMany({ where: { personaId: { in: personas.map((p) => p.id) } } });
    const vigentesEnArchivo = new Map<string, number>();
    return leidas.map(({ f, l }): FilaPlan<DatosContrato> => {
      const etiqueta = `${l.rut} · ${l.cargo}`;
      const errores = erroresDeContrato(l);
      const persona = porRut.get(l.rut);
      if (!persona) errores.push("No hay una persona con ese RUT en OPAI. Importa primero las personas.");
      else if (persona.archivadaEn || persona.anonimizadaEn) errores.push("La persona está archivada o anonimizada: no se le crea un contrato desde una importación.");
      const cargo = cargos.find((c) => norm(c.nombre) === norm(l.cargo));
      if (!cargo) errores.push(`No existe el cargo «${l.cargo}»: créalo antes en Maestros › Cargos.`);
      const instalacion = elegirInstalacion(instalaciones, l, errores);
      if (errores.length || !persona || !cargo || !instalacion || !l.tipo) return { fila: f.fila, clave: `fila:${f.fila}`, etiqueta, accion: "error", mensajes: errores };
      const base = { fila: f.fila, clave: `${l.rut}|${dia(l.inicio)}`, etiqueta, idExterno: null };
      const datos: DatosContrato = {
        personaId: persona.id, cargoId: cargo.id, instalacionId: instalacion.id, tipo: l.tipo, inicio: l.inicio,
        termino: l.termino, horasSemanales: l.horasSemanales, distribucion: l.distribucion,
      };
      const propios = vinculos.filter((v) => v.personaId === persona.id);
      const mismo = propios.find((v) => dia(v.inicio) === dia(l.inicio));
      if (mismo) {
        const cambia = mismo.cargoId !== cargo.id || mismo.instalacionId !== instalacion.id;
        return {
          ...base, accion: "actualizar", datos, existente: mismo,
          mensajes: cambia ? ["El cargo o la instalación de un contrato ya cargado no se cambian desde la importación: usa un anexo."] : [],
        };
      }
      if (estadoDe(l.termino, hoy) === "vigente") {
        const otro = propios.find((v) => v.estado === "vigente");
        const repetida = vigentesEnArchivo.get(persona.id);
        if (otro) return { ...base, clave: `fila:${f.fila}`, accion: "error", mensajes: [`La persona ya tiene un contrato vigente (desde ${dia(otro.inicio)}): termínalo antes o indica su fecha de término.`] };
        if (repetida !== undefined) return { ...base, clave: `fila:${f.fila}`, accion: "error", mensajes: [`La persona ya tiene otro contrato vigente en la fila ${repetida}: solo puede haber uno.`] };
        vigentesEnArchivo.set(persona.id, f.fila);
      }
      return { ...base, accion: "crear", mensajes: [], datos };
    });
  },
  async crear(tx, ctx, d) {
    exigirEdicionVinculo(ctx);
    const hoy = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
    const v = await tx.vinculoLaboral.create({ data: { ...d, tenantId: ctx.tenantId, estado: estadoDe(d.termino, hoy) }, select: { id: true } });
    await ctx.eventos.emitir(tx, {
      tipo: "core.vinculo.creado", entidadTipo: "vinculo", entidadId: v.id,
      payload: { personaId: d.personaId, cargoId: d.cargoId, tipo: d.tipo, inicio: dia(d.inicio) },
    });
    return v.id;
  },
  async actualizar(tx, id, cambios, ctx) {
    exigirEdicionVinculo(ctx);
    const hoy = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
    const { termino, ...resto } = cambios;
    const data = { ...resto, ...("termino" in cambios ? { termino: termino ?? null, estado: estadoDe(termino ?? null, hoy) } : {}), updatedAt: new Date() };
    await tx.vinculoLaboral.update({ where: { id }, data });
  },
  actuales: (tx, ids) => tx.vinculoLaboral.findMany({ where: { id: { in: [...ids] } } }),
  async bloqueos(tx, ids) {
    const con = await tx.vinculoLaboral.findMany({ where: { id: { in: [...ids] }, anexos: { some: {} } }, select: { id: true } });
    return new Map(con.map((v) => [v.id, "tiene anexos de contrato"]));
  },
  async borrar(tx, ids) {
    await tx.vinculoLaboral.deleteMany({ where: { id: { in: [...ids] } } });
  },
};

type Inst = { id: string; nombre: string; cuenta: { nombre: string; rut: string | null } };
function elegirInstalacion(todas: readonly Inst[], l: Leidos, errores: string[]): Inst | undefined {
  let c = todas.filter((i) => norm(i.nombre) === norm(l.instalacion));
  if (c.length > 1 && (l.cuentaRut || l.cuentaNombre))
    c = c.filter((i) => (l.cuentaRut ? i.cuenta.rut === l.cuentaRut : norm(i.cuenta.nombre) === norm(l.cuentaNombre)));
  if (c.length === 1) return c[0];
  errores.push(c.length > 1 ? `Hay ${c.length} instalaciones llamadas «${l.instalacion}»: indica el RUT o el nombre de la cuenta.` : `No existe la instalación «${l.instalacion}». Impórtala antes o revisa el nombre.`);
  return undefined;
}
