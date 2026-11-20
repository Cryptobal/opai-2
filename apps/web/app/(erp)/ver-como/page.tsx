import { PORTALES_VER_COMO } from "@opai/domain";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { exigirDatos } from "@/lib/carga";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { SelectorVerComo, type Objetivo } from "./_componentes/selector-ver-como";

export const metadata = { title: "Ver como…" };

/** «Ver como…» (CAR-528): el owner o un administrador elige portal y a quién, y lo mira en solo lectura. */
export default function VerComo({ searchParams }: { searchParams: SearchParams }) {
  const cargar = async () => {
    const p = await leerParametros(searchParams);
    const portal = PORTALES_VER_COMO.find((x) => x === p["portal"]) ?? "terreno";
    const q = p["q"] ?? "";
    const cursor = p["cursor"];
    const r = await ejecutarComoUsuario<{ items: Objetivo[]; siguiente: string | null }>(
      "erp",
      "core.ver_como.list",
      { portal, q, ...(cursor ? { cursor } : {}) },
    );
    return { portal, q, ...exigirDatos(r) };
  };
  return (
    <PaginaPortal portal="erp" titulo="Ver como…" ruta="/ver-como" cargar={cargar}>
      {(d) => <SelectorVerComo {...d} />}
    </PaginaPortal>
  );
}
