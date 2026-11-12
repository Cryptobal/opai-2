import type { MovimientoBanco } from "./bancos-tipos";
import type { EleccionFila } from "./destinos";

type Ejecutar = <T = unknown>(id: string, input: unknown, dryRun?: boolean) => Promise<T | null>;

/**
 * Concilia el movimiento contra la fila del flujo (y su cuenta contable) y, si se pidió, crea la regla
 * con la glosa elegida. Cada paso pasa antes por su vista previa; la regla se crea solo si la
 * conciliación quedó hecha. Devuelve el texto del aviso, o null si algo falló (el error queda visible).
 */
export async function confirmarContraFila(ejecutar: Ejecutar, mov: MovimientoBanco, e: EleccionFila): Promise<string | null> {
  if (!e.filaId) return null;
  const conciliar = {
    movimientoId: mov.id,
    enlaces: [{ tipo: "flujo_fila", id: e.filaId, monto: Math.abs(mov.monto), cuentaContableId: e.cuentaId }],
  };
  const regla = e.crearRegla
    ? {
        nombre: e.nombreRegla.trim(),
        modo: "todas",
        definicion: {
          alcance: mov.monto > 0 ? "abonos" : "cargos",
          condiciones: [{ campo: "glosa", operador: "contiene", valor: e.glosaContiene.trim() }],
        },
        flujoFilaId: e.filaId,
        cuentaContableId: e.cuentaId,
        activa: true,
      }
    : null;
  if (!(await ejecutar("finanzas.conciliaciones.confirmar", conciliar, true))) return null;
  if (regla && !(await ejecutar("finanzas.reglas_banco.guardar", regla, true))) return null;
  if (!(await ejecutar("finanzas.conciliaciones.confirmar", conciliar))) return null;
  if (regla && !(await ejecutar("finanzas.reglas_banco.guardar", regla))) {
    return null;
  }
  return regla ? `Movimiento conciliado y regla «${regla.nombre}» creada` : "Movimiento conciliado";
}
