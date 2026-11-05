import { MANUAL_OPERAR_EL_NUCLEO } from "./operar-el-nucleo";
import { MANUAL_AGENTE_INTERNO } from "./agente-interno";
import { MANUAL_OPERAR_GROKBOT } from "./operar-grokbot";

/** Manuales para agentes (ADR-032), publicados como recursos MCP `opai://manuales/<id>`. */
export const MANUALES = [
  {
    id: "operar-el-nucleo",
    titulo: "Operar el núcleo de OPAI como agente",
    texto: MANUAL_OPERAR_EL_NUCLEO,
  },
  {
    id: "agente-interno",
    titulo: "Operar el agente interno del tenant",
    texto: MANUAL_AGENTE_INTERNO,
  },
  {
    id: "operar-grokbot",
    titulo: "Operar Comercial y Finanzas con Grokbot",
    texto: MANUAL_OPERAR_GROKBOT,
  },
] as const;
