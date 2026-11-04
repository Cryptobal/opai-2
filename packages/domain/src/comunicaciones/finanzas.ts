import { EMPRESA, type EventoComunicable, v } from "./tipos";

export const COMUNICABLES_FINANZAS: readonly EventoComunicable[] = [
  {
    evento: "finanzas.venta.enviada_cliente",
    nombre: "Documento tributario enviado al cliente",
    descripcion:
      "Correo al cliente con el PDF y el XML del documento emitido. Va a los contactos con rol facturación, con copia a los demás; lo dispara una persona desde la ficha de la venta.",
    transaccional: true,
    variables: [
      v("cliente.nombre", "texto", "Minera Los Andes SpA", "Razón social del cliente."),
      v("documento.tipo", "texto", "Factura electrónica", "Tipo de documento."),
      v("documento.folio", "numero", "1234", "Folio asignado por el SII."),
      v("documento.total", "texto", "$1.190.000", "Monto total con IVA."),
      v("documento.vencimiento", "fecha", "30-11-2026", "Fecha de vencimiento del pago."),
      EMPRESA,
    ],
    plantillas: {
      correo: {
        asunto: "{{documento.tipo}} N° {{documento.folio}} · {{empresa.nombre}}",
        cuerpo:
          "Estimados {{cliente.nombre}}:\n\nAdjuntamos la {{documento.tipo}} N° {{documento.folio}} por {{documento.total}}, con vencimiento el {{documento.vencimiento}}. Van el PDF y el XML.\n\nSi tienen dudas sobre este documento, respondan a su ejecutivo de {{empresa.nombre}}.\n\nSaludos,\n{{empresa.nombre}}",
      },
    },
  },
];
