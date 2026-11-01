import { FileSearch } from "lucide-react";
import { EstadoIlustrado } from "@opai/ds";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

export function AjusteNoEncontrado({ ruta }: { ruta: string }) {
  return (
    <div className="flex flex-1 items-center justify-center text-center [&>div]:items-center">
    <EstadoIlustrado icono={FileSearch} tono="info" titulo="Este ajuste no existe">
      <p className="mb-4">{`Revisa la dirección ${ruta} o vuelve a Configuración.`}</p>
      <EnlaceBoton href="/configuracion">Volver a Configuración</EnlaceBoton>
    </EstadoIlustrado>
    </div>
  );
}
