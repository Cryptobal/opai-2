import { MANUAL_OPERAR_EL_NUCLEO } from "./operar-el-nucleo";

/** Manuales para agentes (ADR-032), publicados como recursos MCP `opai://manuales/<id>`. */
export const MANUALES = [
  {
    id: "operar-el-nucleo",
    titulo: "Operar el núcleo de OPAI como agente",
    texto: MANUAL_OPERAR_EL_NUCLEO,
  },
] as const;
