"use client";

import { Plug } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { Badge, Button } from "@opai/ds";

import type { AppConectadaVista } from "./tipos";

// Diálogo diferido: solo se descarga al abrirlo (presupuesto de JS, ADR-037).
const DesconectarApp = dynamic(() => import("./desconectar-app").then((m) => m.DesconectarApp));

/** Mi cuenta › Apps conectadas (CAR-247): apps como Claude que entran con mi cuenta en esta empresa. */
export function AppsConectadas({ apps }: { apps: AppConectadaVista[] }) {
  const [elegida, setElegida] = useState<AppConectadaVista | null>(null);
  return (
    <section aria-labelledby="t-apps" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 id="t-apps" className="t-label text-fg">
          Apps conectadas
        </h3>
        <p className="text-sm text-fg-muted">
          Apps como Claude que entran a esta empresa con tu cuenta y tus permisos.
        </p>
      </div>
      {apps.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
          {apps.map((a) => (
            <li key={a.clientId} className="flex flex-wrap items-center gap-3 p-3">
              <Plug aria-hidden className="size-5 flex-none text-fg-muted" />
              {/* En teléfono el texto ocupa la fila y la etiqueta y el botón pasan abajo. */}
              <div className="flex min-w-0 flex-1 basis-48 flex-col">
                <span className="truncate text-base text-fg">{a.nombre ?? "App sin nombre"}</span>
                <span className="text-sm text-fg-muted">
                  Conectada el {a.conectadaEnTexto}
                  {a.ultimoUsoTexto ? ` · último uso ${a.ultimoUsoTexto}` : " · sin uso todavía"}
                </span>
              </div>
              <Badge tono={a.puedeEscribir ? "warning" : "neutro"}>
                {a.puedeEscribir ? "Ve y hace cambios" : "Solo ve"}
              </Badge>
              <Button variant="ghost" onClick={() => setElegida(a)}>
                Desconectar
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-border bg-surface p-3 text-sm text-fg-muted">
          No tienes apps conectadas en esta empresa. Cuando conectes una, por ejemplo Claude,
          aparecerá aquí y podrás desconectarla cuando quieras.
        </p>
      )}
      {elegida ? <DesconectarApp app={elegida} onCerrar={() => setElegida(null)} /> : null}
    </section>
  );
}
