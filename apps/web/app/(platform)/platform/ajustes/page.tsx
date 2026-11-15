import { redirect } from "next/navigation";

/** Índice de Ajustes: redirige a Credenciales (Google Maps, Anthropic, etc.). */
export default function Ajustes() {
  redirect("/platform/ajustes/credenciales");
}
