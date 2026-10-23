import { PaginaTenant } from "../pagina-tenant";
import { Modulos } from "../tenant-tabs";

export const metadata = { title: "Módulos de la empresa" };

/** Plataforma → empresa · Módulos: activar, suspender o dejar en prueba. */
export default function Pagina({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PaginaTenant params={params} tab="modulos">
      {(d) => <Modulos detalle={d} />}
    </PaginaTenant>
  );
}
