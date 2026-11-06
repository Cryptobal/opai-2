import { PaginaBandeja } from "@/app/_components/rendiciones/bandeja/pagina";

export const metadata = { title: "Bandeja del aprobador" };

export default function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <PaginaBandeja searchParams={searchParams} />;
}
