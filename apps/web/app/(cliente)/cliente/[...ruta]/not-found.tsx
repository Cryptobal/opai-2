import { NoEncontrado } from "@/app/_components/no-encontrado";
import { tituloNoEncontrado } from "@/app/_components/portales";

export const metadata = { title: tituloNoEncontrado("cliente") };
export default function NoEncontradoPortal() {
  return <NoEncontrado portal="cliente" />;
}
