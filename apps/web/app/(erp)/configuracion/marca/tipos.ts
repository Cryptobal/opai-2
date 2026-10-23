export type Marca = {
  nombreComercial: string | null;
  eslogan: string | null;
  colorPrimario: string | null;
  colorSecundario: string | null;
  logoPrincipalId: string | null;
  logoClaroId: string | null;
  logoOscuroId: string | null;
  isotipoId: string | null;
  faviconId: string | null;
  urls: Record<string, string>;
};

export type Slot = "logoPrincipalId" | "logoClaroId" | "logoOscuroId" | "isotipoId" | "faviconId";

/** Ranuras de logo (22): fondo de muestra y tipo de documento de marca que usa cada una. */
export const SLOTS: {
  id: Slot;
  param: string;
  etiqueta: string;
  fondo: "ambos" | "claro" | "oscuro";
  tipo: "marca.logo" | "marca.favicon";
  ayuda?: string;
}[] = [
  {
    id: "logoPrincipalId",
    param: "principal",
    etiqueta: "Principal",
    fondo: "ambos",
    tipo: "marca.logo",
  },
  {
    id: "logoClaroId",
    param: "claro",
    etiqueta: "Fondo claro",
    fondo: "claro",
    tipo: "marca.logo",
  },
  {
    id: "logoOscuroId",
    param: "oscuro",
    etiqueta: "Fondo oscuro",
    fondo: "oscuro",
    tipo: "marca.logo",
  },
  { id: "isotipoId", param: "isotipo", etiqueta: "Isotipo", fondo: "ambos", tipo: "marca.logo" },
  {
    id: "faviconId",
    param: "favicon",
    etiqueta: "Favicon",
    fondo: "claro",
    tipo: "marca.favicon",
    ayuda: "32×32 px",
  },
];
