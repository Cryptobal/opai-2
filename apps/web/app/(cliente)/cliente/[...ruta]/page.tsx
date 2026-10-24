import { tituloNoEncontrado } from "@/app/_components/portales";
import { RutaInexistente } from "@/app/_components/ruta-inexistente";

// El título va aquí y en el not-found: se fija en ambos para no depender de cuál resuelva Next.
export const metadata = { title: tituloNoEncontrado("cliente") };

export default RutaInexistente;
