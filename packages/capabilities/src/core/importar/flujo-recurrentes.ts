// Importador de gastos recurrentes del flujo de caja (CAR-349, bloque 3). Cada fila de la planilla es una regla:
// va a una fila de egresos que ya existe (se reconoce por su nombre) y se identifica por fila + concepto, o por su id
// de origen. El monto se guarda entero según su unidad, igual que `finanzas.recurrentes.crear`.
import { fecha, idsExternos, norm, texto, entero } from "./comun";
import { DEF_FLUJO_RECURRENTES, montoEscalado, problemaRegla } from "./flujo-campos";
import { PERMISO_FLUJO_CONFIGURAR } from "./flujo-filas";
import type { FilaPlan, Importador } from "./tipos";

export type DatosFlujoRecurrente = {
  filaId: string; concepto: string; unidad: string; monto: number; frecuencia: string; diaDelMes: number | null;
  inicio: Date; fin: Date | null; repeticiones: number | null; politicaUf: string; ufDiaFijo: number | null; nota: string | null;
};

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export const importadorFlujoRecurrentes: Importador<DatosFlujoRecurrente> = {
  def: DEF_FLUJO_RECURRENTES,
  entidad: "flujo_recurrente",
  permiso: PERMISO_FLUJO_CONFIGURAR,
  modulo: "finanzas",
  actualizables: ["nota"],
  async planificar(ctx, filas, o) {
    const externos = await idsExternos(ctx, "flujo_recurrente", o.sistema, filas.map((f) => texto(f.datos["id_externo"]) ?? ""));
    const filasFlujo = await ctx.db.flujoFila.findMany({ select: { id: true, etiqueta: true, seccion: true, activa: true } });
    const existentes = await ctx.db.flujoRecurrente.findMany({ select: { id: true, filaId: true, concepto: true, nota: true, unidad: true, monto: true, frecuencia: true } });
    const porNombre = new Map(filasFlujo.map((f) => [norm(f.etiqueta), f]));
    const porId = new Map(existentes.map((e) => [e.id, e]));
    return filas.map((f): FilaPlan<DatosFlujoRecurrente> => {
      const concepto = texto(f.datos["concepto"]) ?? "";
      const nombreFila = texto(f.datos["fila"]) ?? "";
      const idExterno = texto(f.datos["id_externo"]);
      const error = (m: string): FilaPlan<DatosFlujoRecurrente> => ({ fila: f.fila, clave: `fila:${f.fila}`, etiqueta: concepto, accion: "error", mensajes: [m] });
      const filaFlujo = porNombre.get(norm(nombreFila));
      if (!filaFlujo) return error(`No hay una fila «${nombreFila}» en el flujo. Importa primero las filas del flujo de caja.`);
      if (filaFlujo.seccion !== "egreso" || !filaFlujo.activa) return error("La fila debe ser de egresos y estar activa.");
      if (concepto.length < 2) return error("El concepto debe tener al menos 2 caracteres.");
      const unidad = texto(f.datos["unidad"]) ?? "clp";
      const monto = montoEscalado(unidad, f.datos["monto"]);
      if (monto == null) return error("El monto debe ser un número mayor que cero (y razonable para su unidad).");
      const inicio = fecha(f.datos["inicio"]);
      if (!inicio) return error("Falta la fecha de inicio.");
      const frecuencia = texto(f.datos["frecuencia"]) ?? "mensual";
      const fin = fecha(f.datos["fin"]);
      const datos: DatosFlujoRecurrente = {
        filaId: filaFlujo.id, concepto, unidad, monto, frecuencia, diaDelMes: entero(f.datos["dia_del_mes"]),
        inicio, fin, repeticiones: entero(f.datos["repeticiones"]), politicaUf: texto(f.datos["politica_uf"]) ?? "dia_cuota",
        ufDiaFijo: entero(f.datos["uf_dia_fijo"]), nota: texto(f.datos["nota"]),
      };
      const problema = problemaRegla({ ...datos, inicio: iso(inicio) ?? "", fin: iso(fin) });
      if (problema) return error(problema);
      const existente =
        (idExterno ? porId.get(externos.get(idExterno) ?? "") : undefined) ??
        existentes.find((e) => e.filaId === filaFlujo.id && norm(e.concepto) === norm(concepto));
      // Del existente solo se completa o sobrescribe la nota: monto, unidad y frecuencia se cambian en el flujo.
      const distinto = existente && (existente.unidad !== unidad || Number(existente.monto) !== monto || existente.frecuencia !== frecuencia);
      const mensajes = distinto ? ["Ya existe con otro monto o frecuencia: la importación no los cambia. Edítalo en el flujo de caja."] : [];
      return {
        fila: f.fila, clave: `${filaFlujo.id}|${norm(concepto)}`, etiqueta: `${concepto} · ${filaFlujo.etiqueta}`,
        accion: existente ? "actualizar" : "crear", mensajes, datos, idExterno, ...(existente ? { existente } : {}),
      };
    });
  },
  async crear(tx, ctx, d) {
    const r = await tx.flujoRecurrente.create({ data: { ...d, monto: BigInt(d.monto), tenantId: ctx.tenantId }, select: { id: true } });
    return r.id;
  },
  async actualizar(tx, id, cambios) {
    await tx.flujoRecurrente.update({ where: { id }, data: { ...(cambios.nota !== undefined ? { nota: cambios.nota } : {}) } });
  },
  actuales: async (tx, ids) =>
    (await tx.flujoRecurrente.findMany({ where: { id: { in: [...ids] } }, select: { id: true, concepto: true, nota: true, updatedAt: true } })).map((r) => ({ ...r, nombre: r.concepto })),
  // Un recurrente no tiene dependientes: sus cuotas se derivan al leer (ADR-026); revertir solo deja de proyectarlas.
  bloqueos: async () => new Map(),
  async borrar(tx, ids) {
    await tx.flujoRecurrente.deleteMany({ where: { id: { in: [...ids] } } });
  },
};
