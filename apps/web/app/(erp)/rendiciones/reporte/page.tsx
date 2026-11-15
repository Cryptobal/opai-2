import { PaginaReporte } from "@/app/_components/rendiciones/reporte/pagina";

export const metadata = { title: "Reporte de rendiciones" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <PaginaReporte searchParams={searchParams} />;
}
