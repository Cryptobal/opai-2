import { ejecutarComoUsuario } from "@/lib/servidor";

import { EditorImportarCotizaciones } from "./editor-importar-cotizaciones";

/**
 * Configuración › Módulos › Comercial · traer las cotizaciones de OPAI 1 (CAR-326). Solo aparece
 * útil si la empresa tiene habilitada la integración «opai1» (CAR-321) con su llave de solo lectura.
 */
export async function SeccionImportarCotizaciones() {
  const opai1 = await ejecutarComoUsuario("erp", "core.integraciones.get", { proveedor: "opai1" });
  return <EditorImportarCotizaciones conOpai1={opai1.ok} />;
}
