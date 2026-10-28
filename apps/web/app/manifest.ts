import type { MetadataRoute } from "next";

// Un solo manifest de OPAI (ADR-044.1, Brief 04): la app es instalable para todos los portales y el
// `start_url` lleva a cada persona a su portal según la membresía (ruta `/entrar`). La marca es OPAI
// por defecto; la marca por tenant (ADR-028) se servirá por una ruta parametrizada en un brief
// posterior, no aquí. Colores desde packages/ds/src/tokens.css (--ds-bg y, en claro, --ds-accent);
// los íconos son provisionales hasta el logo definitivo (D4, ESTADO.md). Activo estático: no usa
// APIs dinámicas, así que Cache Components lo resuelve estático sin necesidad de `dynamic`.

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "OPAI",
    short_name: "OPAI",
    description: "Plataforma operacional para empresas intensivas en personal.",
    start_url: "/entrar",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "es-CL",
    dir: "ltr",
    categories: ["business", "productivity"],
    background_color: "#fafafa",
    theme_color: "#fafafa",
    icons: [
      { src: "/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icono-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
