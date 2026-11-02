import type { Grupo } from "./grupos";
import { Migas } from "./migas";

/** Encabezado común, sobre las dos columnas del grupo (MC-01). */
export function EncabezadoGrupo({ grupo, entrada = false }: { grupo: Grupo; entrada?: boolean }) {
  return (
    <div className={entrada ? "mb-5 hidden md:block" : "mb-5"}>
      <Migas grupo={grupo} />
      <h2 className="t-title mt-2 text-fg">{grupo.etiqueta}</h2>
      <p className="mt-1 text-base text-fg-muted">{grupo.corta}</p>
    </div>
  );
}
