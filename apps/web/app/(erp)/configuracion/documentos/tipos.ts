export type TipoDoc = {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  capa: string;
  obligatorio: boolean;
  tieneVencimiento: boolean;
  diasAlerta: number;
  normativa: string | null;
  visiblePortalDefault: string[];
  activo: boolean;
};

export const CAPAS = [
  { id: "empresa", etiqueta: "Empresa" },
  { id: "cuenta", etiqueta: "Cuenta" },
  { id: "instalacion", etiqueta: "Instalación" },
  { id: "persona", etiqueta: "Persona" },
  { id: "puesto", etiqueta: "Puesto" },
] as const;

export const PORTALES = [
  { valor: "trabajador", etiqueta: "Trabajador" },
  { valor: "cliente", etiqueta: "Cliente" },
  { valor: "supervisor", etiqueta: "Supervisor" },
  { valor: "terreno", etiqueta: "Terreno" },
];

export const etiquetaPortales = (p: string[]) =>
  p.length ? p.map((x) => PORTALES.find((o) => o.valor === x)?.etiqueta ?? x).join(" · ") : "—";
