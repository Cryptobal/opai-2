import { PaginaPortal } from "@/app/_components/pagina-portal";
import { ListaNovedades } from "./lista-novedades";
import { rutaNovedades } from "./ruta-novedades";

export function PaginaNovedades({ portal }: { portal: string }) {
  const ruta = rutaNovedades(portal);
  return (
    <PaginaPortal portal={portal} titulo="Novedades" ruta={ruta}>
      <ListaNovedades portal={portal} />
    </PaginaPortal>
  );
}
