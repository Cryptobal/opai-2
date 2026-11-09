// Fixtures FICTICIOS de la representación impresa (CAR-221). Ningún dato es de un cliente ni de una empresa real:
// los RUT, nombres y direcciones son inventados. Sirven para las pruebas y para la evidencia reproducible.
import type { PdfDteInput } from "./pdf-tipos";

const timbre = (tipo: number, folio: number) =>
  `<TED version="1.0"><DD><RE>76000000-0</RE><TD>${tipo}</TD><F>${folio}</F><FE>2026-11-08</FE><RR>77234567-8</RR><MNT>1309000</MNT></DD></TED>`;

const base = {
  fechaEmision: "2026-11-08",
  emisor: {
    razon: "Empresa de Prueba Ficticia SpA",
    rut: "76000000-0",
    giro: "Servicios de seguridad",
    direccion: "Calle Falsa 123",
    comuna: "Santiago",
    fono: "+56 2 2000 0000",
  },
  receptor: {
    razon: "Cliente Ficticio Ñandú Ltda.",
    rut: "77234567-8",
    giro: "Comercio al por menor",
    direccion: "Avenida Inventada 456",
    comuna: "Providencia",
    ciudad: "Santiago",
  },
  lineas: [
    { descripcion: "Servicio de guardias noviembre 2026", cantidad: "2", precio: 500_000, monto: 1_000_000 },
    { descripcion: "Alarma monitoreada", cantidad: "1", precio: 100_000, monto: 100_000 },
  ],
  neto: 1_100_000,
  exento: 0,
  iva: 209_000,
  total: 1_309_000,
  resolucion: { numero: 0, fecha: "2026-01-15" },
} as const;

export const FIXTURE_FACTURA: PdfDteInput = {
  ...base,
  lineas: [...base.lineas],
  tipoDte: 33,
  folio: 1234,
  referencias: [{ tipoDteRef: 801, folioRef: 4500012345, codigoRef: 0, fechaRef: "2026-11-01", razonRef: "Orden de compra" }],
  timbrePdf417: timbre(33, 1234),
};

export const FIXTURE_NC: PdfDteInput = {
  ...base,
  lineas: [{ descripcion: "Corrección de montos servicio noviembre 2026", cantidad: "1", precio: 100_000, monto: 100_000 }],
  tipoDte: 61,
  folio: 5678,
  neto: 100_000,
  iva: 19_000,
  total: 119_000,
  referencias: [{ tipoDteRef: 33, folioRef: 1234, codigoRef: 3, fechaRef: "2026-11-08", razonRef: "Corrige montos" }],
  timbrePdf417: timbre(61, 5678),
};
