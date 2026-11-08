import { Alerta } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

/** Estado vacío claro del selector de clientes: qué falta para poder facturar y adónde ir. */
export function EmitirSinClientes({
  hayClientes,
  sinRut,
}: {
  hayClientes: boolean;
  sinRut: number;
}) {
  if (hayClientes && sinRut === 0) return null;
  const enlace = (
    <LinkNext href="/cuentas" className="underline">
      Ir a Cuentas
    </LinkNext>
  );
  if (!hayClientes) {
    return (
      <Alerta tono="warning" titulo="No hay clientes para facturar">
        Solo se factura a clientes activos con RUT.{" "}
        {sinRut > 0
          ? `Hay ${sinRut} cliente(s) activo(s) sin RUT: complétalo en su ficha. `
          : "Crea o activa un cliente y completa su RUT. "}
        {enlace}
      </Alerta>
    );
  }
  return (
    <Alerta tono="info" titulo={`${sinRut} cliente(s) activo(s) no aparecen: les falta el RUT`}>
      Completa el RUT en la ficha del cliente para poder facturarle. {enlace}
    </Alerta>
  );
}
