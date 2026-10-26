import { defineDatosPersonales } from "@opai/domain";

// Inventario de las tablas de cumplimiento de la Ley 21.719 (DPA, consentimientos, solicitudes,
// incidentes y registro de retención). Todas son hechos regulados (ADR-023): no se borran. Parte del
// inventario del Núcleo (`inventario.ts`).
export const INVENTARIO_CUMPLIMIENTO = defineDatosPersonales("core", [
  {
    tabla: "dpa_aceptaciones",
    finalidad: "Prueba de aceptación del acuerdo de tratamiento de datos (DPA): quién aceptó cada versión, cuándo y el hash del texto aceptado.",
    categorias: ["identificacion", "contacto"],
    campos: ["aceptado_por_id", "aceptado_por"],
    baseLicitud: "obligacion_legal",
    reguladoNoBorrable: true,
  },
  {
    tabla: "consentimientos",
    finalidad: "Consentimientos del titular para fines accesorios (p. ej. comunicaciones comerciales): a quién, para qué fin y si está otorgado o revocado.",
    categorias: ["identificacion"],
    campos: ["titular_id", "registrado_por"],
    baseLicitud: "consentimiento",
    reguladoNoBorrable: true,
  },
  {
    tabla: "solicitudes_arco",
    finalidad: "Solicitudes del titular (ARCO+): quién pide acceso, rectificación, cancelación, oposición, portabilidad o bloqueo, con su plazo, responsable y evidencia.",
    categorias: ["identificacion", "contacto"],
    campos: ["titular_id", "titular_email", "titular_nombre", "responsable_id"],
    baseLicitud: "obligacion_legal",
    reguladoNoBorrable: true,
  },
  {
    tabla: "retencion_ejecuciones",
    finalidad: "Registro de lo que hizo la política de retención: tabla, acción y cuántas filas; si fue a pedido de un titular, su id. Sin datos personales en claro.",
    categorias: ["identificacion"],
    campos: ["titular_id"],
    baseLicitud: "obligacion_legal",
    reguladoNoBorrable: true,
  },
  {
    tabla: "incidentes",
    finalidad: "Registro de incidentes de seguridad y avisos de brecha (Ley 21.719): alcance, categorías de datos afectados y destinatario del aviso (Agencia y titulares). Sin datos personales en claro.",
    categorias: ["contacto"],
    campos: ["destinatario", "registrado_por"],
    baseLicitud: "obligacion_legal",
    reguladoNoBorrable: true,
  },
]);
