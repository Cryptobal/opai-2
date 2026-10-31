import {
  type AlertaPlan,
  type ClaveSistema,
  type CuentaPlan,
  type GrupoCuenta,
  NATURALEZA_HABITUAL,
  type TipoCuenta,
} from "./plan-tipos";

/** Tipo y grupo que el SII y la práctica contable exigen para las cuentas con clave de sistema. */
const ESPERADO: Readonly<Partial<Record<ClaveSistema, { tipo: TipoCuenta; grupo: GrupoCuenta | null }>>> = {
  caja: { tipo: "activo", grupo: "corriente" },
  bancos: { tipo: "activo", grupo: "corriente" },
  deudores_por_venta: { tipo: "activo", grupo: "corriente" },
  iva_credito: { tipo: "activo", grupo: "corriente" },
  ppm: { tipo: "activo", grupo: "corriente" },
  proveedores: { tipo: "pasivo", grupo: "corriente" },
  iva_debito: { tipo: "pasivo", grupo: "corriente" },
  remuneraciones_por_pagar: { tipo: "pasivo", grupo: "corriente" },
  impuestos_por_pagar: { tipo: "pasivo", grupo: "corriente" },
  capital: { tipo: "patrimonio", grupo: null },
  ventas: { tipo: "ingreso", grupo: null },
};

const esMedible = (t: TipoCuenta) => t === "activo" || t === "pasivo";

/** Errores y avisos de una sola cuenta, sin mirar al resto del plan. */
export function validarCuenta(c: CuentaPlan): AlertaPlan[] {
  const out: AlertaPlan[] = [];
  const alerta = (a: Omit<AlertaPlan, "cuenta">) => out.push({ ...a, cuenta: c.codigo });
  if (c.grupo && !esMedible(c.tipo))
    alerta({
      codigo: "GRUPO_NO_APLICA",
      severidad: "error",
      mensaje: `«${c.nombre}» es ${c.tipo}: el grupo corriente / no corriente solo aplica a activos y pasivos.`,
    });
  if (!c.grupo && esMedible(c.tipo) && c.aceptaAsientos)
    alerta({
      codigo: "GRUPO_FALTANTE",
      severidad: "error",
      mensaje: `«${c.nombre}» es ${c.tipo}: indica si es corriente o no corriente.`,
    });
  const esperado = c.claveSistema ? ESPERADO[c.claveSistema] : undefined;
  if (esperado && c.tipo !== esperado.tipo)
    alerta({
      codigo: "TIPO_INCORRECTO",
      severidad: "error",
      mensaje: `«${c.nombre}» debe ser ${esperado.tipo}, no ${c.tipo}.`,
    });
  else if (esperado && c.grupo !== esperado.grupo && esperado.grupo)
    alerta({
      codigo: "GRUPO_INCORRECTO",
      severidad: "error",
      mensaje: `«${c.nombre}» debe ser ${esperado.tipo} ${esperado.grupo === "corriente" ? "corriente" : "no corriente"}, no ${c.grupo === "no_corriente" ? "no corriente" : (c.grupo ?? "sin grupo")}.`,
    });
  if (c.naturaleza !== NATURALEZA_HABITUAL[c.tipo])
    alerta({
      codigo: "NATURALEZA_INUSUAL",
      severidad: "aviso",
      mensaje: `«${c.nombre}» tiene naturaleza ${c.naturaleza}, la habitual de ${c.tipo} es ${NATURALEZA_HABITUAL[c.tipo]} (válido si es una contra-cuenta).`,
    });
  return out;
}

/** Validación del plan completo: cada cuenta más duplicados, jerarquía y claves repetidas. */
export function validarPlan(cuentas: readonly CuentaPlan[]): AlertaPlan[] {
  const out: AlertaPlan[] = cuentas.flatMap(validarCuenta);
  const porCodigo = new Map<string, CuentaPlan>();
  const claves = new Map<string, string>();
  for (const c of cuentas) {
    if (porCodigo.has(c.codigo))
      out.push({
        codigo: "CODIGO_DUPLICADO",
        severidad: "error",
        cuenta: c.codigo,
        mensaje: `El código ${c.codigo} está repetido.`,
      });
    porCodigo.set(c.codigo, c);
    if (c.claveSistema) {
      const otra = claves.get(c.claveSistema);
      if (otra)
        out.push({
          codigo: "CLAVE_REPETIDA",
          severidad: "error",
          cuenta: c.codigo,
          mensaje: `«${c.nombre}» y la cuenta ${otra} cumplen el mismo rol contable (${c.claveSistema}).`,
        });
      claves.set(c.claveSistema, c.codigo);
    }
  }
  for (const c of cuentas) {
    if (!c.padreCodigo) continue;
    const padre = porCodigo.get(c.padreCodigo);
    if (!padre)
      out.push({
        codigo: "PADRE_INEXISTENTE",
        severidad: "error",
        cuenta: c.codigo,
        mensaje: `«${c.nombre}» cuelga de ${c.padreCodigo}, que no existe.`,
      });
    else if (padre.tipo !== c.tipo)
      out.push({
        codigo: "PADRE_DE_OTRO_TIPO",
        severidad: "error",
        cuenta: c.codigo,
        mensaje: `«${c.nombre}» es ${c.tipo} pero cuelga de «${padre.nombre}», que es ${padre.tipo}.`,
      });
  }
  return out;
}

/** Cuentas que el plan debería tener para operar compras (aviso si faltan; no bloquea). */
export function clavesFaltantes(cuentas: readonly CuentaPlan[]): ClaveSistema[] {
  const tiene = new Set(cuentas.map((c) => c.claveSistema));
  return (["deudores_por_venta", "iva_credito", "iva_debito", "proveedores"] as const).filter(
    (k) => !tiene.has(k),
  );
}
