import { tituloNoEncontrado } from "@/app/_components/portales";
import { RutaInexistente } from "@/app/_components/ruta-inexistente";

// El título va también aquí: el 404 se decide antes del streaming y la pestaña toma el título de la
// página; el del not-found queda como respaldo.
export const metadata = { title: tituloNoEncontrado("trabajador") };

export default RutaInexistente;
