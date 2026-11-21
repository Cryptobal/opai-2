import { cuandoCompleto } from "@/lib/fechas";

import type { IntentoContacto } from "../../../_componentes/datos";

/** Intentos de contacto de la cadena (lectura auditada). */
export function IntentosContacto({ intentos }: { intentos: IntentoContacto[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="t-label text-fg">Intentos de contacto</h3>
      <ul className="overflow-hidden rounded-lg border border-border bg-surface">
        {intentos.map((e) => (
          <li key={e.id} className="border-b border-border px-4 py-2.5 last:border-b-0">
            <span className="t-caption">
              Paso {e.paso} · {e.canal} · {e.resultado} · {cuandoCompleto(e.createdAt)}
            </span>
            {e.nota ? <span className="block text-base text-fg">{e.nota}</span> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}