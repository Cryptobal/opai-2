import { PaginaTurnosExtra } from "./_componentes/pagina";

export const metadata = { title: "Turnos extra" };

export default function Page(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <PaginaTurnosExtra searchParams={props.searchParams} />;
}