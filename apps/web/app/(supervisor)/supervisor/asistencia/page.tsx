import { PantallaAsistenciaHoy } from "@/app/_components/asistencia/pantalla-asistencia-hoy";
import { type SearchParams } from "@/lib/parametros";

export const metadata = { title: "Asistencia de hoy" };
type Props = { searchParams: SearchParams };

/** Supervisor · misma lista que el ERP, filtrada por instalaciones a cargo (ADR-022). */
export default function AsistenciaSupervisor({ searchParams }: Props) {
  return <PantallaAsistenciaHoy portal="supervisor" ruta="/supervisor/asistencia" searchParams={searchParams} />;
}