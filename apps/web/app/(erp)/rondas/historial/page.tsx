import { PaginaHistorialRondas } from "./_componentes/pagina";

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <PaginaHistorialRondas searchParams={searchParams} />;
}