import { configuracion, elegirEntorno } from "./src/configuracion";

// `pnpm sincronizar` prepara OPAI contra test.opai.cl; `OPAI_APP_ENTORNO=produccion` solo para tiendas.
export default configuracion(elegirEntorno(process.env));
