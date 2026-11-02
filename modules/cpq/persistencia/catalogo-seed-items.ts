import type { Rateo } from "../domain/motor/tipos";

export type ItemSeed = {
  codigo: string;
  nombre: string;
  categoriaClave: string;
  costoUnitarioClp: number;
  grupo: string;
  modoCalculo: string;
  recurrencia: "mensual" | "unico";
  rateoJson: string;
  porDefecto: boolean;
};

/** Precios ficticios de referencia 1.0; las fórmulas siguen en la plantilla del motor. */
export const ITEMS_DEFECTO: readonly ItemSeed[] = [
  {
    codigo: "uniforme",
    nombre: "Uniforme",
    categoriaClave: "uniformes",
    costoUnitarioClp: 35_000,
    grupo: "uniforme",
    modoCalculo: "formula.uniforme",
    recurrencia: "mensual",
    rateoJson: '{"tipo":"contrato"}',
    porDefecto: true,
  },
  {
    codigo: "examen",
    nombre: "Examen preocupacional",
    categoriaClave: "examenes",
    costoUnitarioClp: 28_000,
    grupo: "item",
    modoCalculo: "formula.examen",
    recurrencia: "mensual",
    rateoJson: '{"tipo":"contrato"}',
    porDefecto: true,
  },
  {
    codigo: "vehiculo",
    nombre: "Vehículo",
    categoriaClave: "vehiculos",
    costoUnitarioClp: 0,
    grupo: "item",
    modoCalculo: "formula.vehiculo",
    recurrencia: "mensual",
    rateoJson: '{"tipo":"contrato"}',
    porDefecto: false,
  },
  {
    codigo: "infra",
    nombre: "Infraestructura",
    categoriaClave: "infraestructura",
    costoUnitarioClp: 0,
    grupo: "item",
    modoCalculo: "formula.infra",
    recurrencia: "mensual",
    rateoJson: '{"tipo":"contrato"}',
    porDefecto: false,
  },
  {
    codigo: "comida",
    nombre: "Colación",
    categoriaClave: "colacion",
    costoUnitarioClp: 4_500,
    grupo: "item",
    modoCalculo: "formula.comida",
    recurrencia: "mensual",
    rateoJson: '{"tipo":"contrato"}',
    porDefecto: false,
  },
  {
    codigo: "equipo",
    nombre: "Equipamiento por puesto",
    categoriaClave: "equipamiento",
    costoUnitarioClp: 45_000,
    grupo: "item",
    modoCalculo: "por_puesto_mes",
    recurrencia: "mensual",
    rateoJson: '{"tipo":"contrato"}',
    porDefecto: true,
  },
  {
    codigo: "inversion",
    nombre: "Inversión inicial",
    categoriaClave: "otros",
    costoUnitarioClp: 120_000,
    grupo: "item",
    modoCalculo: "inversion",
    recurrencia: "unico",
    rateoJson: '{"tipo":"unico"}',
    porDefecto: false,
  },
];

export function itemMotorDesdeSeed(item: ItemSeed) {
  const rateo = JSON.parse(item.rateoJson) as Rateo;
  const modoCalculo = item.modoCalculo;
  const base = {
    id: item.codigo,
    categoria: item.categoriaClave,
    costoUnitario: item.costoUnitarioClp,
    moneda: "CLP" as const,
    rateo: rateo as Rateo,
  };
  if (modoCalculo.startsWith("formula.")) {
    return { ...base, modo: "formula" as const, formula: modoCalculo };
  }
  if (modoCalculo === "por_puesto_mes") return { ...base, modo: "por_puesto_mes" as const };
  if (modoCalculo === "por_persona_mes") return { ...base, modo: "por_persona_mes" as const };
  if (modoCalculo === "inversion") return { ...base, modo: "inversion" as const };
  return { ...base, modo: "mensual_fijo" as const };
}
