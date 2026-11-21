import { hojaDiferida } from "@/app/_components/hoja-diferida";

export const HojaPrenda = hojaDiferida(["editar"], () =>
  import("./hoja-prenda").then((m) => m.HojaPrenda),
);
export const HojaCategoria = hojaDiferida(["editar"], () =>
  import("./hoja-categoria").then((m) => m.HojaCategoria),
);