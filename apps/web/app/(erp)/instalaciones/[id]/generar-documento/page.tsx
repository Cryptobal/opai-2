import { PaginaGenerarEntidad } from "@/app/_components/documentos/generar-entidad/pagina-generar-entidad";
import type { SearchParams } from "@/lib/parametros";

export const metadata = { title: "Generar documento" };
type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

export default function GenerarDocumento(props: Props) {
  return <PaginaGenerarEntidad tipo="instalacion" {...props} />;
}
