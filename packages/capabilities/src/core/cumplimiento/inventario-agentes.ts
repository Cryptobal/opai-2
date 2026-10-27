import { defineDatosPersonales } from "@opai/domain";

export const INVENTARIO_AGENTES = defineDatosPersonales("core", [
  {
    tabla: "idempotencias",
    finalidad:
      "Evitar escrituras duplicadas y conservar temporalmente el resultado de un plan del agente interno o de una capacidad.",
    categorias: ["identificacion"],
    campos: ["actor", "resultado"],
    baseLicitud: "interes_legitimo",
    retencion:
      "24 horas de vigencia; purga diaria existente core.idempotencia.purgar. Sin memoria conversacional duradera.",
  },
  {
    tabla: "aprobaciones",
    finalidad:
      "Decisión humana sobre acciones irreversibles de agentes externos e internos, vía una persona responsable.",
    categorias: ["identificacion"],
    campos: ["via_user_id", "agente_interno_id", "input", "resuelta_por", "resultado"],
    baseLicitud: "interes_legitimo",
    retencion:
      "Pendientes vencen en 72 horas; retención del historial a confirmar por legal con 07d.",
  },
  {
    tabla: "gasto_agente_mes",
    finalidad:
      "Control atómico del presupuesto mensual por key o del agente interno del tenant, sin prompts ni conversaciones.",
    categorias: ["identificacion", "economica"],
    campos: ["api_key_id", "agente_interno_id", "gastado_micro"],
    baseLicitud: "contrato",
    retencion: "Contador mensual del consumo: política de retención a confirmar por legal con 07d.",
  },
]);
