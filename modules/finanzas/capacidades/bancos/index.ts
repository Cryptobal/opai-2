import { bancosCartolaImportar } from "./cartola-importar";
import { bancosCobroManual } from "./cobro-manual";
import { bancosConciliacionConfirmar, bancosConciliacionDeshacer } from "./conciliacion-confirmar";
import { bancosConciliacionSugerir } from "./conciliacion-sugerir";
import { bancosCuentasGuardar } from "./cuentas-guardar";
import { bancosCuentasListar, bancosSaldoSugerido } from "./cuentas";
import { bancosMovimientosListar } from "./movimientos";
import { bancosReglasGuardar, bancosReglasListar } from "./reglas";

export const capacidadesBancos = [
  bancosCuentasListar,
  bancosCuentasGuardar,
  bancosSaldoSugerido,
  bancosMovimientosListar,
  bancosCartolaImportar,
  bancosConciliacionSugerir,
  bancosConciliacionConfirmar,
  bancosConciliacionDeshacer,
  bancosCobroManual,
  bancosReglasListar,
  bancosReglasGuardar,
];
