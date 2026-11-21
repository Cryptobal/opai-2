import { Estado } from "@opai/ds";
import type { ConfigAcceso } from "@opai/domain/acceso-config";

import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { type Apariencia, EditorApariencia } from "./editor-apariencia";
import { EditorConfig } from "./editor-config";
import {
  EditorGruposLista,
  type GrupoLista,
  type InstalacionOpcion,
} from "./editor-grupos-lista";
import { EditorPuntos, type Punto } from "./editor-puntos";

type Leida = { personalizada: boolean; efectiva: ConfigAcceso };

/**
 * Lee la configuración por `acceso.config.get` y monta el editor (empresa o instalación). En la instalación suma sus
 * puntos de acceso (`acceso.puntos.list`) y la bienvenida de la portería (`acceso.apariencia.get`).
 */
export async function SeccionConfigAcceso({ instalacionId }: { instalacionId?: string }) {
  const [r, p, a, g, insts] = await Promise.all([
    ejecutarComoUsuario<Leida>("erp", "acceso.config.get", instalacionId ? { instalacionId } : {}),
    instalacionId
      ? ejecutarComoUsuario<{ items: Punto[] }>("erp", "acceso.puntos.list", { instalacionId })
      : null,
    instalacionId
      ? ejecutarComoUsuario<Apariencia>("erp", "acceso.apariencia.get", { instalacionId })
      : null,
    !instalacionId
      ? ejecutarComoUsuario<{ items: GrupoLista[] }>("erp", "acceso.grupos.list", { limite: 200 })
      : null,
    !instalacionId
      ? ejecutarComoUsuario<{ items: InstalacionOpcion[] }>("erp", "core.instalaciones.list", {
          limite: 200,
        })
      : null,
  ]);
  return (
    <Estado state={estadoPantalla(r, ...(p && a ? [p, a] : []))} variante="formulario">
      {r.ok && (!p || p.ok) && (!a || a.ok) ? (
        <div className="flex flex-col gap-4">
          {!instalacionId && g?.ok && insts?.ok ? (
            <EditorGruposLista grupos={g.data.items} instalaciones={insts.data.items} />
          ) : null}
          {instalacionId && p?.ok && a?.ok ? (
            <>
              <EditorPuntos instalacionId={instalacionId} puntos={p.data.items} />
              <EditorApariencia instalacionId={instalacionId} apariencia={a.data} />
            </>
          ) : null}
          <EditorConfig
            {...(instalacionId ? { instalacionId, puntos: p?.ok ? p.data.items : [] } : {})}
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
