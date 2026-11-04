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
  {
    evento: "finanzas.cobranza.recordatorio",
    nombre: "Recordatorio de cobro de una factura vencida",
    descripcion:
      "Correo al cliente con el PDF de la factura vencida. Va a los contactos con rol facturación, con copia a los demás. Lo dispara una persona desde la ficha del deudor o, si la empresa lo activa, la secuencia automática de cobranza.",
    transaccional: true,
    variables: [
      v("cliente.nombre", "texto", "Minera Los Andes SpA", "Razón social del cliente."),
      v("documento.tipo", "texto", "Factura electrónica", "Tipo de documento."),
      v("documento.folio", "numero", "1234", "Folio asignado por el SII."),
      v("documento.saldo", "texto", "$1.190.000", "Saldo pendiente de pago."),
      v("documento.vencimiento", "fecha", "30-11-2026", "Fecha de vencimiento del pago."),
      v("documento.dias_vencido", "numero", "12", "Días de atraso a hoy."),
      EMPRESA,
    ],
    plantillas: {
      correo: {
        asunto: "Recordatorio de pago · {{documento.tipo}} N° {{documento.folio}} · {{empresa.nombre}}",
        cuerpo:
          "Estimados {{cliente.nombre}}:\n\nLes recordamos que la {{documento.tipo}} N° {{documento.folio}} venció el {{documento.vencimiento}} y registra un saldo pendiente de {{documento.saldo}} ({{documento.dias_vencido}} días de atraso). Adjuntamos el documento.\n\nSi ya realizaron el pago, por favor ignoren este mensaje o respondan con el comprobante.\n\nSaludos,\n{{empresa.nombre}}",
      },
    },
  },
];
