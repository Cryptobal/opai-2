import { NoEncontrado } from "@/app/_components/no-encontrado";
import { tituloNoEncontrado } from "@/app/_components/portales";

export const metadata = { title: tituloNoEncontrado("trabajador") };
export default function NoEncontradoPortal() {
  return <NoEncontrado portal="trabajador" />;
}
