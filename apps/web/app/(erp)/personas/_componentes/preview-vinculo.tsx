"use client";
import type { SueldoEfectivo } from "@/lib/tipos-sueldo";
import { Alerta, BadgeCapa, TablaEstructura } from "@opai/ds";

export type PreviewVinculo = { antes: SueldoEfectivo; despues: SueldoEfectivo };
export function PreviewVinculo({ vista }: { vista: PreviewVinculo }) {
  return (
    <section className="flex flex-col gap-3" aria-label="Vista previa de cambio de capa">
      <h3 className="t-heading">Cómo cambia la capa que rige</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ["Antes", vista.antes],
            ["Después", vista.despues],
          ] as const
        ).map(([titulo, s]) => (
          <div key={titulo} className="flex min-w-0 flex-col gap-2">
            <h4 className="t-label">{titulo}</h4>
            {s.capa ? <BadgeCapa capa={s.capa} /> : <p className="t-caption">Sin capa definida</p>}
            {s.estructura && s.capa ? (
              <TablaEstructura
                estructura={s.estructura}
                origen={{ capa: s.capa, version: s.estructura.vigenteDesde }}
              />
            ) : null}
          </div>
        ))}
      </div>
      {vista.despues.estado !== "completa" ? (
        <Alerta tono="warning" titulo="Sin sueldo completo resuelto">
          Puedes guardar el vínculo y completar la capa después.
        </Alerta>
      ) : null}
      <p className="t-caption">
        El cambio queda registrado para el borrador de anexo. Su generación y aprobación se
        incorporan en el PR 4.
      </p>
    </section>
  );
}
