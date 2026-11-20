import { COMPRAS_QA as q } from "../../testing/src/compras-qa";

/** Datos nuevos, enteramente sintéticos; los defaults se incluyen al verificar repeticiones. */
export function datosComprasQa(tenantId: string) {
  const fecha = new Date("2000-01-01T00:00:00.000Z");
  return {
    proveedor: {
      id: q.proveedor,
      tenantId,
      rut: "RUT-FICTICIO-CAR-COMPRAS",
      razonSocial: "Proveedor ficticio QA compras CAR-239",
      plazoPagoDias: 0,
    },
    cuenta: {
      id: q.cuenta,
      tenantId,
      banco: "Banco ficticio QA compras",
      numeroVisible: "NO-ES-CUENTA",
    },
    documentos: [
      { id: q.pendiente, folio: q.folioPendiente },
      { id: q.pagada, folio: q.folioPagada },
    ].map((doc) => ({
      ...doc,
      tenantId,
      proveedorId: q.proveedor,
      tipoDte: 33,
      fechaEmision: fecha,
      fechaRecepcion: fecha,
      montoNeto: 100,
      montoIva: 19,
      montoTotal: 119,
      glosa: q.marca,
      origen: "manual",
    })),
    movimiento: {
      id: q.movimiento,
      tenantId,
      cuentaId: q.cuenta,
      fecha,
      monto: -119n,
      glosa: q.marca,
      claveDedupe: q.marca,
      estado: "conciliado",
      origen: "manual",
    },
    conciliacion: {
      id: q.conciliacion,
      tenantId,
      movimientoId: q.movimiento,
      tipoEnlace: "documento_recibido",
      enlaceId: q.pagada,
      monto: 119n,
      activa: true,
      confirmada: true,
    },
  };
}

export const DEFAULTS_QA = {
  proveedor: {
    giro: null,
    email: null,
    telefono: null,
    cuentaGastoId: null,
    cuentaPorPagarId: null,
    centroCostoId: null,
    notas: null,
    activo: true,
  },
  cuenta: {
    moneda: "CLP",
    flujoFilaId: null,
    mapeoColumnas: null,
    activa: true,
    ultimaSyncEn: null,
    saldoBanco: null,
    saldoBancoEn: null,
  },
  documento: {
    montoExento: 0,
    montoOtros: 0,
    estadoRecepcion: "pendiente_revision",
    centroCostoId: null,
  },
  movimiento: {
    cartolaId: null,
    referencia: null,
    sucursal: null,
    saldoDespues: null,
    idExterno: null,
  },
  conciliacion: { propuesta: false, explicacion: null, cuentaContableId: null, createdById: null },
} as const;
