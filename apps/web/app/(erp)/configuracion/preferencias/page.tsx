import { permanentRedirect } from "next/navigation";

/**
 * Preferencias pasó a ser una página propia de la cuenta (decisión de Carlos, 30-oct-2026 09:33 CLT,
 * chat con OPAI 2.0): esta URL queda como redirect permanente para no romper enlaces ni marcadores.
 */
export default function PreferenciasRedirect() {
  permanentRedirect("/mi-cuenta/preferencias");
}
