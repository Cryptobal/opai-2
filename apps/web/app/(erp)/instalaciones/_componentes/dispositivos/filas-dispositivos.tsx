import { Badge } from "@opai/ds";

import { fechaHora } from "@/lib/formato";

import { BotonRevocar } from "./acciones-dispositivos";

type Item = {
  id: string;
  identificador: string;
  estado: "activo" | "revocado";
  emparejadoEn: string;
  ultimoContacto: string | null;
  versionApp: string | null;
};

export function FilasDispositivos({
  items,
  puedeGestionar,
}: {
  items: Item[];
  puedeGestionar: boolean;
}) {
  return (
    <ul className="divide-y divide-border">
      {items.map((d) => (
        <li
          key={d.id}
          className="flex min-h-14 flex-wrap items-center justify-between gap-3 py-3"
        >
          <div className="flex min-w-0 flex-col">
            <span className="flex items-center gap-2 text-base font-medium text-fg">
              <span className="t-mono">{d.identificador}</span>
              <Badge tono={d.estado === "activo" ? "success" : "neutro"}>
                {d.estado === "activo" ? "Activo" : "Revocado"}
              </Badge>
            </span>
            <span className="t-caption">
              Emparejado {fechaHora(d.emparejadoEn)}
              {d.ultimoContacto ? ` · último contacto ${fechaHora(d.ultimoContacto)}` : ""}
              {d.versionApp ? ` · ${d.versionApp}` : ""}
            </span>
          </div>
          {puedeGestionar && d.estado === "activo" ? (
            <BotonRevocar dispositivoId={d.id} identificador={d.identificador} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}