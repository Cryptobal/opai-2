import { PaginaNovedades } from "@/app/_components/novedades/pagina-novedades";

export const metadata = { title: "Novedades" };

export default function NovedadesTrabajador() {
  return <PaginaNovedades portal="trabajador" />;
}
