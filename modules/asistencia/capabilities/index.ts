import { trabajoVerificarCadenaMarcas } from "./cadena";
import { marcasObtener, marcasListar } from "./lecturas";
import { marcasRegistrar } from "./registrar";
import { marcasVerificar } from "./verificar";

export { ajustesAsistencia } from "./ajustes";
export { fijarVerificadorIdentidad, PIN_SIMULADO } from "./identidad-registro";
export const trabajosAsistencia = [trabajoVerificarCadenaMarcas];
export const capacidades = [marcasRegistrar, marcasListar, marcasObtener, marcasVerificar];
