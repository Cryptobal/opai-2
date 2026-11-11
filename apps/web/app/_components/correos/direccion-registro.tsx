import dynamic from "next/dynamic";

// Botones cargados aparte del primer JS de la ficha (ADR-037).
const BotonCopiar = dynamic(() =>
  import("@/app/_components/boton-copiar").then((m) => m.BotonCopiar),
);
const CrearDireccion = dynamic(() => import("./crear-direccion").then((m) => m.CrearDireccion));

/**
 * Dirección de registro de la empresa para el CCO del vendedor (CAR-233). OPAI no es un cliente de
 * correo: el vendedor sigue escribiendo desde su casilla y pone esta dirección en copia oculta.
 */
export function DireccionRegistro({
  direccion,
  puedeCrear,
}: {
  direccion: string | null;
  puedeCrear: boolean;
}) {
  if (!direccion)
    return (
      <div className="flex flex-col gap-2">
        <p className="t-caption">
          Para registrar los correos que escribes desde tu casilla, la empresa necesita su dirección
          de registro. Se crea sola con el primer envío desde OPAI.
        </p>
        {puedeCrear ? <CrearDireccion /> : null}
      </div>
    );
  return (
    <div className="flex flex-col gap-2">
      <p className="t-caption">
        Al escribirle a un cliente desde tu casilla, pon esta dirección en <strong>CCO</strong> y el
        correo quedará en su ficha. Las respuestas a los correos que salen de OPAI llegan aquí
        solas.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="t-mono min-w-0 rounded-md bg-fill px-2 py-1 text-sm break-all">
          {direccion}
        </code>
        <BotonCopiar texto={direccion} etiqueta="Copiar dirección" />
      </div>
    </div>
  );
}
