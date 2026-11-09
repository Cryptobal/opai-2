import { PaginaPortal } from "@/app/_components/pagina-portal";
import { CargaNovedades } from "./carga-novedades";
import { rutaNovedades } from "./ruta-novedades";

export function PaginaNovedades({ portal }: { portal: string }) {
  const ruta = rutaNovedades(portal);
  return (
    <PaginaPortal portal={portal} titulo="Novedades" ruta={ruta}>
      <CargaNovedades portal={portal} />
    </PaginaPortal>
  );
}
