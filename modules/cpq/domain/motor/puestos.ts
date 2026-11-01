import { personasPorPosicion } from "./dotacion";
import { evaluarFormula } from "./formulas";
import { N } from "./numero";
import type { LineaCalculada, ModeloCosteo, Puesto, Traza, VersionCalculo } from "./tipos";

export function calcularPuesto(l: Puesto, v: VersionCalculo, modelo: ModeloCosteo, traza: Traza[], dato: { costoMensualClp: number; origen: string }): LineaCalculada[] {
  if (!Number.isSafeInteger(dato.costoMensualClp) || dato.costoMensualClp < 0) throw new Error("Costo del proveedor inválido");
  const personas = personasPorPosicion(l).por(N(l.posiciones));
  const monto = N(dato.costoMensualClp).por(personas), costo = monto.entero();
  const feriados = evaluarFormula("formula.ajuste_feriados", modelo, v.variables, { ...l.variables, mano_obra: costo });
  traza.push({ item: l.id, monto: "costoMensual", formula: "costoEmpleadorClp × personasPorPosicion × posiciones",
    variables: [{ clave: "origen", ambito: "parametro", valor: dato.origen }, { clave: "costoEmpleadorClp", ambito: "linea", valor: dato.costoMensualClp },
      { clave: "personasPorPosicion", ambito: "linea", valor: personasPorPosicion(l).exacto() },
      { clave: "posiciones", ambito: "linea", valor: l.posiciones },
      { clave: "patron", ambito: "linea", valor: l.patron },
      { clave: "horario", ambito: "linea", valor: `${l.horaInicio}–${l.horaFin}` },
      { clave: "diasCobertura", ambito: "linea", valor: l.diasCobertura },
      ...(l.personasPorPosicionEscaladas === undefined ? [] : [{ clave: "motivoPersonas", ambito: "linea" as const, valor: l.motivoPersonas ?? "" }])],
    valor: costo, exacto: monto.exacto() });
  traza.push({ item: `${l.id}:feriados`, monto: "costoMensual", formula: modelo.formulas.find((f) => f.clave === "ajuste_feriados")?.expresion ?? "",
    variables: feriados.variables, valor: feriados.valor.entero(), exacto: feriados.valor.exacto() });
  const base = { seccion: l.seccion, costoUnico: 0, ventaUnica: 0, ventaAdicional: 0 };
  return [{ ...base, id: l.id, categoria: "mano_obra", costoMensual: costo },
    { ...base, id: `${l.id}:feriados`, categoria: "feriados", costoMensual: feriados.valor.entero() }];
}
