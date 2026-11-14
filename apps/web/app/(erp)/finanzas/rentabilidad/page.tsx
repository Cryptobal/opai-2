import { PaginaRentabilidad } from "./pagina";

export const metadata = { title: "Rentabilidad por instalación" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <PaginaRentabilidad searchParams={searchParams} />;
}
