// Importador de facturas, notas de crédito y notas de débito ya emitidas (CAR-283, épica CAR-279).
// Registra el historial en el libro de ventas sin llamar al SII, sin firmar y sin usar folios de los CAF.
import { PERMISO_VENTAS } from "../../finanzas/ventas-comun";
import { resolverCuentas } from "./comun";
import type { FilaPlan, Importador } from "./tipos";
import { DEF_DOCUMENTOS_VENTA, type DatosDocumentoVenta, datosDocumento, TIPOS_NOTA } from "./ventas-campos";

const clave = (tipo: number, folio: number) => `${tipo}-${folio}`;

export const importadorDocumentosVenta: Importador<DatosDocumentoVenta> = {
  def: DEF_DOCUMENTOS_VENTA,
  entidad: "documento_venta",
  permiso: PERMISO_VENTAS,
  modulo: "finanzas",
  // Un documento emitido no se reescribe: si ya está en OPAI, la fila queda sin cambios.
  actualizables: [],
  async planificar(ctx, filas, o) {
    const cuentaDe = await resolverCuentas(ctx, filas, o.sistema);
    const folios = filas.map((f) => Number(f.datos["folio"] ?? 0)).filter((n) => Number.isInteger(n) && n > 0);
    const [existentes, cafs] = await Promise.all([
      ctx.db.documentoEmitido.findMany({
        where: { folio: { in: [...new Set([...folios, ...filas.map((f) => Number(f.datos["ref_folio"] ?? 0))])] } },
        select: { id: true, tipoDte: true, folio: true, cuentaId: true },
      }),
      ctx.db.dteFolio.findMany({ select: { tipoDte: true, folioHasta: true, folioActual: true } }),
    ]);
    const enOpai = new Map(existentes.map((d) => [clave(d.tipoDte, d.folio ?? 0), d]));
    const vistos = new Map<string, number>();
    const cuentaDeVisto = new Map<string, string>();
    return filas.map((f): FilaPlan<DatosDocumentoVenta> => {
      const r = cuentaDe(f);
      const { datos, conDesglose, supuestaCobrada, montosValidos } = datosDocumento(f, "error" in r ? "" : r.cuenta.id);
      const k = clave(datos.tipoDte, datos.folio);
      const etiqueta = `${datos.tipoDte} · folio ${datos.folio}`;
      const base = { fila: f.fila, clave: k, etiqueta, idExterno: null, datos };
      const falla = (m: string): FilaPlan<DatosDocumentoVenta> => ({ ...base, clave: `fila:${f.fila}`, accion: "error", mensajes: [m] });
      if (datos.folio <= 0) return falla("El folio debe ser un número mayor que cero.");
      const repetida = vistos.get(k);
      if (repetida !== undefined) return falla(`El mismo tipo y folio ya está en la fila ${repetida}.`);
      vistos.set(k, f.fila);
      const existente = enOpai.get(k);
      if (existente) return { ...base, accion: "sin_cambio", mensajes: ["Ya está en OPAI: no se toca."], existente: { id: existente.id } };
      if ("error" in r) return falla(/importa primero/i.test(r.error) ? r.error : `${r.error} Importa primero las cuentas.`);
      if (datos.montoTotal <= 0) return falla("El monto total debe ser mayor que cero.");
      if (datos.montoNeto + datos.montoExento + datos.montoIva !== datos.montoTotal)
        return falla("Neto + exento + IVA no suma el monto total.");
      if (!montosValidos) return falla("Montos inválidos: sin negativos, la factura exenta sin IVA y la afecta con neto.");
      // Un folio histórico dentro de un rango todavía sin usar haría fallar esa emisión futura (índice único).
      if (cafs.some((c) => c.tipoDte === datos.tipoDte && datos.folio >= c.folioActual && datos.folio <= c.folioHasta))
        return falla("El folio está dentro de un rango de folios de OPAI todavía sin usar: revisa los folios antes de importar.");
      cuentaDeVisto.set(k, datos.cuentaId);
      const avisos: string[] = [];
      if (!conDesglose) avisos.push("Sin neto ni IVA: se calcularon desde el total.");
      if (supuestaCobrada) avisos.push("Sin monto cobrado: se asume cobrada entera. Escribe 0 si todavía se debe.");
      if (TIPOS_NOTA.has(datos.tipoDte)) {
        const kRef = datos.refTipoDte && datos.refFolio ? clave(datos.refTipoDte, datos.refFolio) : null;
        const cuentaRef = kRef ? (enOpai.get(kRef)?.cuentaId ?? cuentaDeVisto.get(kRef)) : undefined;
        if (!kRef) avisos.push("La nota no indica qué documento corrige: queda sin vínculo.");
        else if (cuentaRef === undefined) avisos.push("El documento que corrige no está en OPAI ni antes en la planilla: queda sin vínculo.");
        else if (cuentaRef !== datos.cuentaId) avisos.push("El documento que corrige es de otro cliente: revisa la referencia.");
      }
      return { ...base, accion: "crear", mensajes: avisos };
    });
  },
  async crear(tx, ctx, d) {
    const ref =
      d.refTipoDte && d.refFolio
        ? await tx.documentoEmitido.findFirst({ where: { tipoDte: d.refTipoDte, folio: d.refFolio }, select: { id: true } })
        : null;
    const doc = await tx.documentoEmitido.create({
      data: {
        tenantId: ctx.tenantId, cuentaId: d.cuentaId, tipoDte: d.tipoDte, folio: d.folio,
        fechaEmision: d.fechaEmision, fechaVencimiento: d.fechaVencimiento,
        montoNeto: d.montoNeto, montoExento: d.montoExento, montoIva: d.montoIva, montoTotal: d.montoTotal,
        montoCobrado: d.montoCobrado, estadoDte: d.estadoDte, estadoCobro: d.estadoCobro,
        cesionEstado: d.cesionEstado, cesionProveedor: d.cesionProveedor, glosa: d.glosa,
        documentoReferenciaId: ref?.id ?? null, codigoReferencia: ref ? d.codigoReferencia : null,
      },
      select: { id: true },
    });
    // Lo cobrado en el origen no tiene conciliación: queda como base del saldo en la fila del lote (cobros.ts).
    return d.montoCobrado > 0 ? { id: doc.id, previos: { cobradoApertura: d.montoCobrado } } : doc.id;
  },
  async actualizar() {
    // Sin campos actualizables: el motor nunca lo llama con cambios.
  },
  actuales: (tx, ids) => tx.documentoEmitido.findMany({ where: { id: { in: [...ids] } } }),
  async bloqueos(tx, ids) {
    const lista = [...ids];
    const [docs, conciliados, notas, cobroEsperado] = await Promise.all([
      tx.documentoEmitido.findMany({
        where: { id: { in: lista } },
        select: { id: true, _count: { select: { cesiones: true, enviosSii: true, enviosCliente: true, gestionesCobranza: true, corridasProgramacion: true } } },
      }),
      tx.conciliacionBanco.findMany({ where: { tipoEnlace: "documento_emitido", enlaceId: { in: lista }, activa: true }, select: { enlaceId: true } }),
      tx.documentoEmitido.findMany({ where: { documentoReferenciaId: { in: lista }, id: { notIn: lista } }, select: { documentoReferenciaId: true } }),
      tx.flujoCobroEsperado.findMany({ where: { documentoId: { in: lista } }, select: { documentoId: true } }),
    ]);
    const motivo = new Map<string, string>();
    for (const d of docs) if (Object.values(d._count).some((n) => n > 0)) motivo.set(d.id, "ya tiene cesiones, envíos o gestiones de cobranza en OPAI");
    for (const c of conciliados) motivo.set(c.enlaceId, "tiene cobros conciliados en Bancos");
    for (const n of notas) if (n.documentoReferenciaId) motivo.set(n.documentoReferenciaId, "tiene notas emitidas en OPAI que lo corrigen");
    for (const c of cobroEsperado) motivo.set(c.documentoId, "tiene una fecha de cobro esperada en el flujo de caja");
    return motivo;
  },
  async borrar(tx, ids) {
    // Primero las notas (referencian a sus facturas), después el resto.
    await tx.documentoEmitido.deleteMany({ where: { id: { in: [...ids] }, documentoReferenciaId: { not: null } } });
    await tx.documentoEmitido.deleteMany({ where: { id: { in: [...ids] } } });
  },
};
