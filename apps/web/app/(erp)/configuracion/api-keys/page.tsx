import { redirect } from "next/navigation";

/** Ruta del Brief 01: las keys viven ahora en Configuración → Agentes y API keys. */
export default function ApiKeys() {
  redirect("/configuracion/agentes");
}
