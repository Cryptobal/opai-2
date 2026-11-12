import { ejecutarComoUsuario } from "@/lib/servidor";

import { EditorImportar10 } from "./editor-importar-1-0";

/**
 * Configuración › Módulos › Comercial · importación desde OPAI 1.0 (CAR-25). «Traer directo desde OPAI 1»
 * solo aparece si la empresa tiene habilitada la integración «opai1» (CAR-321); pegar el JSON sigue para todas.
 */
export async function SeccionImportar10() {
  const opai1 = await ejecutarComoUsuario("erp", "core.integraciones.get", { proveedor: "opai1" });
  return <EditorImportar10 conOpai1={opai1.ok} />;
}
