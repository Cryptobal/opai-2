import { bancosCartolaImportar } from "./cartola-importar";
import { bancosCartolasDeshacer, bancosCartolasListar } from "./cartolas";
import { bancosCobroManual } from "./cobro-manual";
import { bancosConciliacionConfirmar } from "./conciliacion-confirmar";
import { bancosConciliacionDeshacer } from "./conciliacion-deshacer";
import { bancosConciliacionSugerir } from "./conciliacion-sugerir";
import { bancosCuentasGuardar } from "./cuentas-guardar";
import { bancosCuentasListar } from "./cuentas";
import { bancosSaldoSugerido } from "./cuentas-saldo-sugerido";
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
  bancosCartolasListar,
  bancosCartolasDeshacer,
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
