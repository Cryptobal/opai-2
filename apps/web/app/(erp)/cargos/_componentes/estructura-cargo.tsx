import { DatoArchivado, SeccionTarjeta, TablaEstructura } from "@opai/ds";
import { fecha } from "@/lib/fechas";
import type { EstructuraVista } from "@/lib/tipos-sueldo";

/** Todas las versiones originales, también las anuladas; ninguna participa en la resolución. */
export function Versiones({ versiones }: { versiones: EstructuraVista[] }) {
  return (
    <SeccionTarjeta titulo="Estructuras antiguas del cargo">
      {versiones.length ? (
        <div className="flex flex-col gap-3">
          {versiones.map((v) => (
            <DatoArchivado
              key={v.id}
              titulo={`Versión del ${fecha(v.vigenteDesde)}`}
              periodo={`${fecha(v.vigenteDesde)} – ${v.vigenteHasta ? fecha(v.vigenteHasta) : "sin término registrado"}`}
            >
              {v.estado === "anulada" ? <p className="t-caption">Versión anulada</p> : null}
              <TablaEstructura estructura={v} />
              {v.motivo ? <p className="t-caption">Motivo: {v.motivo}</p> : null}
            </DatoArchivado>
          ))}
        </div>
      ) : (
        <p className="t-body-sm">Sin estructuras antiguas.</p>
      )}
    </SeccionTarjeta>
  );
}
