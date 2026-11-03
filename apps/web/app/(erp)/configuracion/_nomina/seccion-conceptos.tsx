import { Estado } from "@opai/ds";

import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type { Concepto } from "@/app/(erp)/remuneraciones/_componentes/tipos";

import { EditorConceptos } from "./editor-conceptos";

/**
 * Pestaña «Conceptos» de Configuración › Módulos › Nómina (diseño 09, ADR-018): haberes y descuentos con
 * su tratamiento y su código LRE «por verificar». Los ajustes del módulo (día de cierre, umbral,
 * empleador, representante) los renderiza el núcleo desde el manifest; aquí no hay página propia.
 */
export async function SeccionConceptos() {
  const r = await ejecutarComoUsuario<Concepto[]>("erp", "nomina.conceptos.listar", { incluirInactivos: true });
  return (
    <Estado state={r.ok ? "ready" : estadoPantalla(r)} variante="formulario">
      {r.ok ? <EditorConceptos conceptos={r.data} /> : null}
    </Estado>
  );
}
