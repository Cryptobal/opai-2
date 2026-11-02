import { Estado } from "@opai/ds";

import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type { AjustesFlujo, FilaFlujo } from "@/app/(erp)/finanzas/flujo/_componentes/datos";

import { EditorFlujoCaja } from "./editor-flujo-caja";

/** Configuración › Módulos › Finanzas › Flujo de caja (diseño v3 pantalla 07). */
export async function SeccionFlujoCaja() {
  const [filasR, ajustesR] = await Promise.all([
    ejecutarComoUsuario<FilaFlujo[]>("erp", "finanzas.filas.listar", { incluirInactivas: true }),
    ejecutarComoUsuario<AjustesFlujo>("erp", "finanzas.ajustes.obtener", {}),
  ]);
  const ok = filasR.ok && ajustesR.ok;
  const state = ok ? "ready" : estadoPantalla(filasR.ok ? ajustesR : filasR);
  return (
    <Estado state={state} variante="formulario">
      {ok ? <EditorFlujoCaja filas={filasR.data} ajustes={ajustesR.data} /> : null}
    </Estado>
  );
}
