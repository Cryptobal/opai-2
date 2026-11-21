import { redirect } from "next/navigation";

/** El control de acceso se entra desde la pestaña «Accesos» de cada instalación: la ruta global lleva a Instalaciones. */
export default function Accesos(): never {
  redirect("/instalaciones");
}
