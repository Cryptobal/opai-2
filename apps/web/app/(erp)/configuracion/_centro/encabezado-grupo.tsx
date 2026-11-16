import type { Grupo } from "./grupos";
import { Migas } from "./migas";

/**
 * Encabezado común, sobre las dos columnas del grupo (MC-01). Un catálogo con ruta propia (Cargos,
 * CAR-319) pasa su `titulo`: migas del grupo y el nombre del catálogo, sin la descripción del grupo.
 */
export function EncabezadoGrupo({
  grupo,
  entrada = false,
  titulo,
}: {
  grupo: Grupo;
  entrada?: boolean;
  titulo?: string;
}) {
  return (
    <div className={entrada ? "mb-5 hidden md:block" : "mb-5"}>
      <Migas grupo={grupo} />
      <h2 className="t-title mt-2 text-fg">{titulo ?? grupo.etiqueta}</h2>
      {titulo ? null : <p className="mt-1 text-base text-fg-muted">{grupo.corta}</p>}
    </div>
  );
}
