import type { Instrumentos, ModeloCosteo, Variable } from "./tipos";

export const INSTRUMENTOS_DEFECTO: Instrumentos = {
  financiero: { habilitado: false, tasaPct: 25_000 },
  garantia: { habilitada: false, modo: "porcentaje", meses: 12, contratoPct: 100_000,
    tasaAnualPct: 20_000, administracionPct: 2_000, montoUf: 0, incluirUnicos: false },
  rc: { habilitada: false, modo: "prima", primaAnualUf: 0, aseguradoUf: 15_000_000,
    tasaAnualPct: 3_000, asignacionPct: 1_000_000, plazo: "anual", meses: 12 },
};
const numero = (clave: string, defecto: number, escala = 1): Variable => ({ clave, defecto, escala, unidad: "numero" });
const clp = (clave: string): Variable => ({ clave, defecto: 0, escala: 1, unidad: "clp" });
/** Datos copiables del modelo, sin consulta global ni precios de clientes. R6/R13/R55/R65. */
export const PLANTILLA_SEGURIDAD: ModeloCosteo = {
  id: "seguridad", version: 1, vertical: "seguridad", valores: {},
  categorias: [
    { id: "mano_obra", nombre: "Mano de obra", clase: "directo" },
    { id: "feriados", nombre: "Ajuste de feriados", clase: "directo", fija: true },
    { id: "uniformes", nombre: "Uniformes", clase: "directo" },
    { id: "examenes", nombre: "Exámenes", clase: "directo" },
    { id: "colacion", nombre: "Colación", clase: "directo" },
    { id: "movilizacion", nombre: "Movilización", clase: "directo" },
    { id: "equipamiento", nombre: "Equipamiento", clase: "indirecto" },
    { id: "vehiculos", nombre: "Vehículos", clase: "indirecto" },
    { id: "infraestructura", nombre: "Infraestructura", clase: "indirecto" },
    { id: "otros", nombre: "Otros", clase: "indirecto" },
  ],
  variables: [clp("mano_obra"), clp("precio"), clp("arriendo"), clp("combustible"), clp("mantencion"),
    numero("feriados_anuales", 12), numero("colchon", 100_000, 1_000_000),
    numero("personas", 0, 10_000), numero("posiciones", 0), numero("cantidad", 10_000, 10_000),
    numero("cambios_anuales", 2), numero("permanencia_meses", 12), numero("km_dia", 0),
    numero("dias_mes", 30), numero("km_litro", 1), numero("litros_hora", 0), numero("horas_dia", 0),
    numero("comidas_dia", 0)],
  formulas: [
    { clave: "ajuste_feriados", expresion: "mano_obra / 30 * (1 / 2) * (feriados_anuales / 12) * (1 + colchon)", unidad: "clp" },
    { clave: "uniforme", expresion: "precio * cambios_anuales / 12 * personas", unidad: "clp" },
    { clave: "examen", expresion: "precio * max(12 / permanencia_meses, cambios_anuales) / 12 * personas", unidad: "clp" },
    { clave: "vehiculo", expresion: "(arriendo + km_dia * dias_mes / km_litro * combustible + mantencion) * cantidad", unidad: "clp" },
    { clave: "infra", expresion: "(arriendo + litros_hora * horas_dia * dias_mes * combustible) * cantidad", unidad: "clp" },
    { clave: "comida", expresion: "precio * comidas_dia * dias_mes", unidad: "clp" },
  ],
  items: [
    { id: "uniforme", categoria: "uniformes", costoUnitario: 0, moneda: "CLP", modo: "formula", formula: "formula.uniforme", rateo: { tipo: "contrato" } },
    { id: "examen", categoria: "examenes", costoUnitario: 0, moneda: "CLP", modo: "formula", formula: "formula.examen", rateo: { tipo: "contrato" } },
    { id: "vehiculo", categoria: "vehiculos", costoUnitario: 0, moneda: "CLP", modo: "formula", formula: "formula.vehiculo", rateo: { tipo: "contrato" } },
    { id: "infra", categoria: "infraestructura", costoUnitario: 0, moneda: "CLP", modo: "formula", formula: "formula.infra", rateo: { tipo: "contrato" } },
    { id: "comida", categoria: "colacion", costoUnitario: 0, moneda: "CLP", modo: "formula", formula: "formula.comida", rateo: { tipo: "contrato" } },
    { id: "equipo", categoria: "equipamiento", costoUnitario: 0, moneda: "CLP", modo: "por_puesto_mes", rateo: { tipo: "contrato" } },
    { id: "inversion", categoria: "otros", costoUnitario: 0, moneda: "CLP", modo: "inversion", rateo: { tipo: "contrato" } },
  ],
  instrumentos: INSTRUMENTOS_DEFECTO,
};
