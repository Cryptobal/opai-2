import { novedadesDescartarDestacada, novedadesMarcarLeidas, novedadesMarcarTodas } from "./escritura";
import { novedadesList } from "./lista";

export const capacidadesNovedades = [
  novedadesList,
  novedadesMarcarLeidas,
  novedadesMarcarTodas,
  novedadesDescartarDestacada,
] as const;
