import { Estado } from "@opai/ds";
import type { ConfigAcceso } from "@opai/domain/acceso-config";

import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { EditorConfig } from "./editor-config";
import { EditorPuntos, type Punto } from "./editor-puntos";

type Leida = { personalizada: boolean; efectiva: ConfigAcceso };

/**
 * Lee la configuración por `acceso.config.get` y monta el editor (empresa o instalación). En la instalación suma sus
 * puntos de acceso (`acceso.puntos.list`).
 */
export async function SeccionConfigAcceso({ instalacionId }: { instalacionId?: string }) {
  const [r, p] = await Promise.all([
    ejecutarComoUsuario<Leida>("erp", "acceso.config.get", instalacionId ? { instalacionId } : {}),
    instalacionId
      ? ejecutarComoUsuario<{ items: Punto[] }>("erp", "acceso.puntos.list", { instalacionId })
      : null,
  ]);
  return (
    <Estado state={estadoPantalla(r, ...(p ? [p] : []))} variante="formulario">
      {r.ok && (!p || p.ok) ? (
        <div className="flex flex-col gap-4">
          {instalacionId && p?.ok ? (
            <EditorPuntos instalacionId={instalacionId} puntos={p.data.items} />
          ) : null}
          <EditorConfig
            {...(instalacionId ? { instalacionId } : {})}
            efectiva={r.data.efectiva}
            personalizada={r.data.personalizada}
          />
        </div>
      ) : null}
    </Estado>
  );
}

/** Pestaña «Formulario y reglas» de Configuración › Módulos › Control de acceso (ADR-018). */
export const SeccionConfigEmpresa = () => <SeccionConfigAcceso />;
