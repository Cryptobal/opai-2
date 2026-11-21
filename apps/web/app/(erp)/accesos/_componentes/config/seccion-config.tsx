import { Estado } from "@opai/ds";
import type { ConfigAcceso } from "@opai/domain/acceso-config";

import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { EditorConfig } from "./editor-config";

type Leida = { personalizada: boolean; efectiva: ConfigAcceso };

/** Lee la configuración por `acceso.config.get` y monta el editor (empresa o instalación). */
export async function SeccionConfigAcceso({ instalacionId }: { instalacionId?: string }) {
  const r = await ejecutarComoUsuario<Leida>(
    "erp",
    "acceso.config.get",
    instalacionId ? { instalacionId } : {},
  );
  return (
    <Estado state={r.ok ? "ready" : estadoPantalla(r)} variante="formulario">
      {r.ok ? (
        <EditorConfig
          {...(instalacionId ? { instalacionId } : {})}
          efectiva={r.data.efectiva}
          personalizada={r.data.personalizada}
        />
      ) : null}
    </Estado>
  );
}

/** Pestaña «Formulario y reglas» de Configuración › Módulos › Control de acceso (ADR-018). */
export const SeccionConfigEmpresa = () => <SeccionConfigAcceso />;
