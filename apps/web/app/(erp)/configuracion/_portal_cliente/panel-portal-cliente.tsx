"use client";

import { lazy, Suspense, useState } from "react";

import { Alerta, Campo, Loading, Select } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { TarjetasConfiguracion } from "./tarjetas-config";
import type {
  AccesoFila,
  Candidato,
  ConfigCuenta,
  CuentaOpcion,
  InstalacionOpcion,
  TipoDocumentoOpcion,
} from "./tipos";

// La tarjeta de accesos se descarga aparte: el tope de JS de la ruta es ajustado (ADR-037).
const TarjetaAccesos = lazy(() => import("./tarjeta-accesos").then((m) => ({ default: m.TarjetaAccesos })));

export type DatosPortal = { config: ConfigCuenta; accesos: AccesoFila[]; candidatos: Candidato[]; instalaciones: InstalacionOpcion[] };

/**
 * Panel del Portal Cliente de una cuenta: qué ve (config) y quién entra (accesos). Al cambiar de
 * cuenta vuelve a leer por capacidades; el servidor aplica permisos y alcance (ADR-022).
 */
export function PanelPortalCliente({
  cuentas,
  tiposDocumento,
  fija,
  inicial,
}: {
  cuentas: CuentaOpcion[];
  tiposDocumento: TipoDocumentoOpcion[];
  fija: boolean;
  /** Datos de la primera cuenta, leídos en el servidor: no hay carga inicial en el cliente. */
  inicial: DatosPortal | null;
}) {
  const { ejecutar, error } = useCapacidad("erp");
  const [cuentaId, setCuentaId] = useState(cuentas[0]?.id ?? "");
  const [datos, setDatos] = useState<DatosPortal | null>(inicial);

  async function cargar(id: string) {
    const [config, accesos, candidatos, instalaciones] = await Promise.all([
      ejecutar<ConfigCuenta>("portal_cliente.config.leer", { cuentaId: id }, false, "ninguna"),
      ejecutar<AccesoFila[]>("portal_cliente.accesos.listar", { cuentaId: id }, false, "ninguna"),
      ejecutar<Candidato[]>("portal_cliente.accesos.candidatos", {}, false, "ninguna"),
      ejecutar<{ items: InstalacionOpcion[] }>("core.instalaciones.list", { cuentaId: id, limite: 100 }, false, "ninguna"),
    ]);
    setDatos(
      config && accesos && candidatos
        ? { config, accesos, candidatos, instalaciones: instalaciones?.items ?? [] }
        : null,
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {fija ? null : (
        <Campo etiqueta="Cliente" htmlFor="portal-cliente-cuenta" className="max-w-sm">
          <Select
            id="portal-cliente-cuenta"
            valor={cuentaId}
            opciones={cuentas.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
            onCambiar={(v) => {
              setDatos(null);
              setCuentaId(v);
              void cargar(v);
            }}
          />
        </Campo>
      )}
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      {datos ? (
        <div className="grid items-start gap-4 lg:grid-cols-2" key={cuentaId}>
          <TarjetasConfiguracion config={datos.config} tiposDocumento={tiposDocumento} />
          <Suspense fallback={<Loading variante="formulario" />}>
            <TarjetaAccesos
              cuentaId={cuentaId}
              accesos={datos.accesos}
              candidatos={datos.candidatos}
              instalaciones={datos.instalaciones}
              recargar={() => cargar(cuentaId)}
            />
          </Suspense>
        </div>
      ) : error ? null : (
        <Loading variante="formulario" />
      )}
    </div>
  );
}
