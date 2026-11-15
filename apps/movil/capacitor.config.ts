import { configuracion, elegir } from "./src/variantes";

// `OPAI_APP=terreno pnpm sincronizar` prepara OPAI Terreno; sin variables, OPAI contra test.opai.cl.
const { variante, entorno } = elegir(process.env);

export default configuracion(variante, entorno);
