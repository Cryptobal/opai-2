import { PaginaBandeja } from "@/app/_components/rendiciones/bandeja/pagina";

export const metadata = { title: "Revisar rendición" };

export default function Page({
  searchParams,
  params,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  params: Promise<{ id: string }>;
}) {
  return <PaginaBandeja searchParams={searchParams} params={params} />;
}
