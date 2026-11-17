// Borrador de la hoja «Agregar» de una lista de acceso (CAR-475).
export type AlcanceLista = "empresa" | "cuenta" | "instalacion" | "grupo";

export type Borrador = {
  nombre: string;
  docTipo: string;
  numero: string;
  pais: string;
  tipos: string[];
  hasta: string;
  dias: number[];
  desde: string;
  hastaHora: string;
  usoUnico: boolean;
  motivo: string;
  alcance: AlcanceLista;
  grupoId: string;
};

export const BORRADOR_VACIO: Borrador = {
  nombre: "",
  docTipo: "run",
  numero: "",
  pais: "",
  tipos: [],
  hasta: "",
  dias: [],
  desde: "",
  hastaHora: "",
  usoUnico: false,
  motivo: "",
  alcance: "instalacion",
  grupoId: "",
};

export const ALCANCES_LISTA = [
  { valor: "instalacion" as const, etiqueta: "Esta instalación" },
  { valor: "cuenta" as const, etiqueta: "Toda la cuenta cliente" },
  { valor: "empresa" as const, etiqueta: "Toda la empresa" },
  { valor: "grupo" as const, etiqueta: "Grupo de instalaciones" },
];

export const DOCS = [
  { valor: "run", etiqueta: "RUN" },
  { valor: "pasaporte", etiqueta: "Pasaporte" },
  { valor: "otro", etiqueta: "Otro documento" },
];
export const TIPOS = [
  ["visita", "Visita"],
  ["contratista", "Contratista"],
  ["proveedor", "Proveedor"],
  ["vehiculo", "Vehículo"],
  ["despacho", "Despacho"],
] as const;
// 0 = domingo, igual que el cruce con listas de @opai/domain.
export const DIAS = [
  [1, "Lun"],
  [2, "Mar"],
  [3, "Mié"],
  [4, "Jue"],
  [5, "Vie"],
  [6, "Sáb"],
  [0, "Dom"],
] as const;

/** «09:30» → 570 minutos desde la medianoche. */
export const minutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
