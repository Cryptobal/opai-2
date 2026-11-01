import { PCT_ESCALA, clp, type CLP } from "../dinero";
import { jsonCanonico } from "../canon";
import { horasSemanalesSugeridas } from "../turnos";
import { congelar, entero, razonClp } from "./aritmetica";
import type { ContratoCostoEmpleador, TrazaRemuneracion } from "./contrato";
import type { Indicador } from "./indicadores";
import { impuestoUnico } from "./impuesto";
import { validarHorario } from "./horario";
import { montoUfClp } from "./jornada";
import { calcularProvisiones } from "./provisiones";
import { resolverSueldo } from "./sueldo";
import { indicadorUsado } from "./valores";

export const costoEmpleadorPorPersona: ContratoCostoEmpleador = (entrada, juego) => {
  const e = JSON.parse(jsonCanonico(entrada)) as typeof entrada;
  const j = JSON.parse(jsonCanonico(juego)) as typeof juego;
  if (e.horario) validarHorario(e.horario);
  const { haberes: h, capa, minimo, atada } = resolverSueldo(e, j);
  const traza: TrazaRemuneracion[] = [];
  const registrar = (concepto: string, paso: number, formula: string, valorClp: CLP,
    claves: Indicador[] = [], variables: Record<string, number | string> = {}): CLP => {
    traza.push({ concepto, paso, formula, valorClp, variables, indicadores: claves.map((k) => indicadorUsado(j, k)) });
    return valorClp;
  };
  const tasa = (base: CLP, pct: number) => razonClp([base, pct], [PCT_ESCALA]);
  registrar("Sueldo base", 1, atada ? "IMM proporcional por jornada" : "sueldo de entrada/capa", h.sueldoBase,
    atada ? ["imm", "jornada"] : [], { jornadaMinutos: e.jornadaMinutosSemanales });
  registrar("Gratificación", 1, "legal: min((base+bonos imponibles)×25%, IMM×4,75/12); fija: entrada; ninguna: 0", h.gratificacion,
    ["imm"], { base: h.sueldoBase, bonosImponibles: h.bonosImponibles });
  registrar("Bonos imponibles", 1, "suma bonos imponibles de la capa", h.bonosImponibles);
  registrar("Haberes imponibles", 1, "base + gratificación + bonos imponibles", h.imponible);
  registrar("Colación", 2, "colación de entrada/capa", h.colacion);
  registrar("Movilización", 2, "movilización de entrada/capa", h.movilizacion);
  registrar("Bonos no imponibles", 2, "suma bonos no imponibles", h.bonosNoImponibles);
  registrar("No imponibles", 2, "colación + movilización + bonos no imponibles", h.noImponible);
  const uf = indicadorUsado(j, "uf").valor;
  const topes = indicadorUsado(j, "topes").valor;
  const basePrevisionalClp = registrar("Base previsional", 3, "min(imponible, tope AFP/salud/Ley 16.744 × UF)",
    clp(Math.min(h.imponible, montoUfClp(topes.pensionSaludUf, uf))), ["topes", "uf"]);
  const baseCesantiaClp = registrar("Base cesantía", 3, "min(imponible, tope cesantía × UF)",
    clp(Math.min(h.imponible, montoUfClp(topes.cesantiaUf, uf))), ["topes", "uf"]);
  const sisClp = registrar("SIS", 4, "base previsional × tasa SIS", tasa(basePrevisionalClp, indicadorUsado(j, "sis").valor), ["sis"]);
  const c = indicadorUsado(j, "cesantia").valor;
  if (!["indefinido", "plazo_fijo"].includes(e.contrato)) throw new RangeError("Tipo de contrato inválido");
  const indefinido = e.contrato === "indefinido";
  const cesantiaEmpleadorClp = registrar("Cesantía empleador", 4, "base cesantía × tasa según contrato",
    tasa(baseCesantiaClp, indefinido ? c.indefinidoEmpleador : c.plazoFijoEmpleador), ["cesantia"], { contrato: e.contrato });
  entero(e.mutualAdicional, "Mutual adicional", 0, PCT_ESCALA);
  const mutual = indicadorUsado(j, "mutual").valor;
  const mutualClp = registrar("Ley 16.744 y SANNA", 4, "base previsional × (básica + SANNA + adicional tenant)",
    tasa(basePrevisionalClp, entero(mutual.basica + mutual.sanna + e.mutualAdicional, "Mutual total", 0, PCT_ESCALA)),
    ["mutual"], { basica: mutual.basica, sanna: mutual.sanna, adicional: e.mutualAdicional });
  const reforma = indicadorUsado(j, "reforma").valor;
  const tasaReformaNeta = reforma.tasa - (reforma.incluyeSis ? indicadorUsado(j, "sis").valor : 0);
  entero(tasaReformaNeta, "Reforma neta de SIS", 0, PCT_ESCALA);
  const reformaClp = registrar("Reforma", 4, "base × (tasa reforma - SIS si está incluido)",
    tasa(basePrevisionalClp, tasaReformaNeta), ["reforma", "sis"], { tasaNeta: tasaReformaNeta });
  const p = calcularProvisiones(h, e.provisiones, j);
  registrar("Base vacaciones", 5, "base contable elegida; excluye no imponibles y aportes", p.baseVacacionesClp,
    [], { seleccion: e.provisiones.baseVacaciones });
  registrar("Base indemnización", 5, "min(base contable elegida, 90 UF del juego)", p.baseIndemnizacionClp,
    ["topes", "uf"], { seleccion: e.provisiones.baseIndemnizacion });
  const vacacionesClp = registrar("Vacaciones", 5, "base/30 × días corridos anuales/12", p.vacacionesClp,
    [], { dias: e.provisiones.diasVacacionesCorridosAnuales });
  const indemnizacionClp = registrar("Indemnización", 5, "base/12 × probabilidad; 0 desde 132 meses", p.indemnizacionClp,
    [], { meses: e.provisiones.mesesAntiguedad, probabilidad: e.provisiones.probabilidadIndemnizacion });
  const costoEmpresaMensualClp = registrar("Costo empresa mensual", 6, "haberes + aportes + provisiones",
    clp(h.total + sisClp + cesantiaEmpleadorClp + mutualClp + reformaClp + vacacionesClp + indemnizacionClp));
  const afp = indicadorUsado(j, "afp").valor;
  const comision = afp.comisiones[e.afp];
  entero(comision, "Comisión AFP", 0, PCT_ESCALA);
  const afpClp = registrar("AFP trabajador", 7, "base previsional × (obligatoria + comisión AFP)",
    tasa(basePrevisionalClp, afp.obligatoria + comision), ["afp"], { afp: e.afp });
  const saludMin = tasa(basePrevisionalClp, afp.salud);
  if (!["fonasa", "isapre"].includes(e.salud.tipo)) throw new RangeError("Sistema de salud inválido");
  const saludClp = registrar("Salud", 7, "Fonasa: legal; Isapre: max(legal, plan UF)",
    e.salud.tipo === "fonasa" ? saludMin : clp(Math.max(saludMin, montoUfClp(e.salud.planUf, uf))),
    ["afp", "uf"], { sistema: e.salud.tipo, planUf: e.salud.tipo === "isapre" ? e.salud.planUf : 0 });
  const cesantiaTrabajadorClp = registrar("Cesantía trabajador", 7, "indefinido: base AFC × tasa; plazo fijo: 0",
    tasa(baseCesantiaClp, indefinido ? c.indefinidoTrabajador : 0), ["cesantia"]);
  // SII Oficio 2406/2016: legal + adicional deducibles hasta 7% del tope, no del sueldo.
  const saludDeducibleClp = registrar("Salud deducible", 7, "min(salud pagada, tasa salud × tope previsional UF)",
    clp(Math.min(saludClp, tasa(montoUfClp(topes.pensionSaludUf, uf), afp.salud))), ["afp", "topes", "uf"]);
  const tributable = registrar("Base tributable", 7, "imponible - AFP - salud deducible - cesantía trabajador",
    clp(Math.max(0, h.imponible - afpClp - saludDeducibleClp - cesantiaTrabajadorClp)));
  const impuesto = impuestoUnico(tributable, j);
  const impuestoUnicoClp = registrar("Impuesto único", 7, "max(0, base tributable × factor - rebaja UTM × UTM)",
    impuesto.montoClp, ["utm", "impuesto"], { factor: impuesto.tramo.tasa, rebajaUtm: impuesto.tramo.rebajaUtm });
  const liquidoEstimadoClp = registrar("Líquido estimado", 7, "total haberes - AFP - salud - AFC - impuesto",
    clp(h.total - afpClp - saludClp - cesantiaTrabajadorClp - impuestoUnicoClp));
  return congelar({ costoEmpresaMensualClp, liquidoEstimadoClp, traza,
    desglose: { haberes: h, basePrevisionalClp, baseCesantiaClp, sisClp, cesantiaEmpleadorClp,
      mutualClp, reformaClp, vacacionesClp, indemnizacionClp, afpClp, saludClp, saludDeducibleClp, cesantiaTrabajadorClp, impuestoUnicoClp },
    juegoDeValores: j, huellaJuegoDeValores: j.huella, capaUsada: capa, entradaUsada: e,
    advertencias: [...j.advertencias,
      "TODO(decisión Carlos): validar bases contables y días corridos de vacaciones con contabilidad",
      ...(e.horario && horasSemanalesSugeridas(e.horario) > indicadorUsado(j, "jornada").valor
        ? [`Horario excede ${indicadorUsado(j, "jornada").valor} h semanales: ajustar horario u horas extra`] : []),
      ...(h.sueldoBase < minimo ? ["danger: sueldo base bajo el IMM proporcional vigente"] : []),
    ],
  });
};
