import { bancosCartolaImportar } from "./cartola-importar";
import { bancosCobroManual } from "./cobro-manual";
import { bancosConciliacionConfirmar } from "./conciliacion-confirmar";
import { bancosConciliacionDeshacer } from "./conciliacion-deshacer";
import { bancosConciliacionSugerir } from "./conciliacion-sugerir";
import { bancosCuentasGuardar } from "./cuentas-guardar";
import { bancosCuentasListar, bancosSaldoSugerido } from "./cuentas";
import { bancosMovimientosListar } from "./movimientos";
import { bancosRecibirWeb4leads } from "./recibir-web4leads";
import { bancosReglasGuardar, bancosReglasListar } from "./reglas";
import { bancosReglasAplicar, bancosReglasProbar } from "./reglas-acciones";
import { bancosDestinosListar } from "./reglas-destinos";
import { bancosSincronizar } from "./sincronizar";

export const capacidadesBancos = [
  bancosCuentasListar,
  bancosCuentasGuardar,
  bancosSaldoSugerido,
  bancosMovimientosListar,
  bancosCartolaImportar,
  bancosSincronizar,
  bancosRecibirWeb4leads,
  bancosConciliacionSugerir,
  bancosConciliacionConfirmar,
  bancosConciliacionDeshacer,
  bancosCobroManual,
  bancosReglasListar,
  bancosReglasGuardar,
  bancosReglasProbar,
  bancosReglasAplicar,
  bancosDestinosListar,
];
