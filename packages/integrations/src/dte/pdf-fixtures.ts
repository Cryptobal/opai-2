// Fixtures FICTICIOS de la representación impresa (CAR-221). Ningún dato es de un cliente ni de una empresa real:
// los RUT, nombres y direcciones son inventados. Sirven para las pruebas y para la evidencia reproducible.
import { crc32, deflateSync } from "node:zlib";

import type { PdfPrevioInput } from "./pdf-previo";
import type { PdfDteInput } from "./pdf-tipos";

const timbre = (tipo: number, folio: number) =>
  `<TED version="1.0"><DD><RE>76000000-0</RE><TD>${tipo}</TD><F>${folio}</F><FE>2026-11-08</FE><RR>77234567-8</RR><MNT>1309000</MNT></DD></TED>`;

/** Logo de prueba (PNG 120 × 40 generado aquí): un rombo y barras de colores. No es el logo de ninguna empresa. */
function logoDePrueba(): Uint8Array {
  const [w, h] = [120, 40];
  const crudo = Buffer.alloc((w * 3 + 1) * h);
  for (let fila = 0; fila < h; fila++) {
    crudo[fila * (w * 3 + 1)] = 0;
    for (let col = 0; col < w; col++) {
      const rombo = Math.abs(col - 20) + Math.abs(fila - 20) <= 18;
      const barra = col >= 48 && col < 112 && fila % 10 < 6;
      const [r, g, b] = rombo ? [30, 90, 160] : barra ? [20 + (col - 48) * 3, 140, 90] : [255, 255, 255];
      crudo.set([r, g, b], fila * (w * 3 + 1) + 1 + col * 3);
    }
  }
  const trozo = (tipo: string, datos: Buffer) => {
    const cuerpo = Buffer.concat([Buffer.from(tipo, "latin1"), datos]);
    const largo = Buffer.alloc(4);
    largo.writeUInt32BE(datos.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(cuerpo));
    return Buffer.concat([largo, cuerpo, crc]);
  };
  const cabecera = Buffer.alloc(13);
  cabecera.writeUInt32BE(w, 0);
  cabecera.writeUInt32BE(h, 4);
  cabecera.set([8, 2, 0, 0, 0], 8);
  const firma = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return new Uint8Array(Buffer.concat([firma, trozo("IHDR", cabecera), trozo("IDAT", deflateSync(crudo)), trozo("IEND", Buffer.alloc(0))]));
}

export const LOGO_DE_PRUEBA = logoDePrueba();

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
  logo: { bytes: LOGO_DE_PRUEBA, formato: "png" },
  lineas: [
    {
      descripcion: "Servicio de guardias noviembre 2026\nPeríodo: 1 al 30 de noviembre de 2026\nInstalación Torre Ficticia, turnos de 12 horas",
      cantidad: "2",
      precio: 500_000,
      monto: 1_000_000,
    },
    base.lineas[1],
  ],
  tipoDte: 33,
  folio: 1234,
  referencias: [{ tipoDteRef: 801, folioRef: 4500012345, codigoRef: 0, fechaRef: "2026-11-01", razonRef: "Orden de compra" }],
  timbrePdf417: timbre(33, 1234),
};

/** Borrador de la misma factura: sin folio ni timbre y con la marca de agua. El receptor no trae ciudad. */
export const FIXTURE_BORRADOR: PdfDteInput = {
  ...FIXTURE_FACTURA,
  folio: null,
  timbrePdf417: null,
  borrador: true,
  receptor: { razon: "Cliente Ficticio Ñandú Ltda.", rut: "77234567-8", giro: "Comercio al por menor", direccion: "Avenida Inventada 456", comuna: "Providencia" },
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

/** 45 líneas: obliga a repartir el detalle en varias páginas y a repetir el documento en la copia CEDIBLE. */
export const FIXTURE_FACTURA_LARGA: PdfDteInput = {
  ...FIXTURE_FACTURA,
  lineas: Array.from({ length: 45 }, (_, i) => ({
    descripcion: `Servicio ${i + 1} de guardias en turno nocturno, instalación Torre Ficticia Ñuñoa`,
    cantidad: "1",
    precio: 10_000,
    monto: 10_000,
  })),
  neto: 450_000,
  iva: 85_500,
  total: 535_500,
  glosa: "Facturación de prueba con detalle extenso. Todos los datos son ficticios.",
};

const previo: PdfPrevioInput = {
  tipo: "proforma",
  numeroInterno: "PF-2026-12-000042",
  version: 1,
  fechaEmision: "2026-11-25",
  fechaVencimiento: "2026-12-31",
  periodo: "diciembre 2026",
  instalacion: "Edificio Titanium Ficticio",
  emisor: base.emisor,
  receptor: base.receptor,
  lineas: [{ descripcion: "Servicio de seguridad, diciembre 2026", cantidad: "UF 120,00", monto: 4_777_008 }],
  neto: 4_777_008,
  exento: 0,
  iva: 907_632,
  total: 5_684_640,
  uf: { valor: "39.812,47", fecha: "2026-11-30", estimada: true },
  referencias: ["OC 4500123 (801)"],
};

export const FIXTURE_PROFORMA: PdfPrevioInput = previo;
export const FIXTURE_ESTADO_PAGO: PdfPrevioInput = {
  ...previo,
  tipo: "estado_pago",
  numeroInterno: "EP-2026-12-000042",
  firmas: { aprobadoPor: { nombre: "Ana Rojas (ficticia)", fecha: "2026-11-29" } },
};
