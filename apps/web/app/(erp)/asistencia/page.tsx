import { PantallaAsistenciaHoy } from "@/app/_components/asistencia/pantalla-asistencia-hoy";
import { type SearchParams } from "@/lib/parametros";

export const metadata = { title: "Asistencia de hoy" };
type Props = { searchParams: SearchParams };

export default function AsistenciaHoy({ searchParams }: Props) {
  return <PantallaAsistenciaHoy portal="erp" ruta="/asistencia" searchParams={searchParams} />;
}