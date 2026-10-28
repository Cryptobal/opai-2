import type { PanelSueldo } from "@opai/capabilities";
import { SeccionTarjeta } from "@opai/ds";
import { fecha } from "@/lib/fechas";
import { EnlaceBoton } from "../maestros/enlace-boton";

export function HistorialCargos({ vinculos }: { vinculos: PanelSueldo["cargosRetirados"] }) {
  if (!vinculos.length) return null;
  return (
    <SeccionTarjeta titulo="Capa cargo (retirada)">
      <p className="t-body-sm">
        Los cargos de los vínculos se conservan como referencia histórica. Sus estructuras
        originales son de solo lectura y ya no se usan para pagar. Las fechas siguientes
        corresponden al vínculo, no a periodos pagados.
      </p>
      <ul className="flex flex-col gap-3">
        {vinculos.map((v) => (
          <li key={v.vinculoId}>
            <p className="t-caption">
              {v.cargo} · vínculo desde {fecha(v.inicio)}
              {v.termino ? ` hasta ${fecha(v.termino)}` : " · sin término registrado"}
            </p>
            <EnlaceBoton variante="secondary" href={`/cargos/${v.cargoId}`}>
              Ver estructuras antiguas del cargo
            </EnlaceBoton>
          </li>
        ))}
      </ul>
    </SeccionTarjeta>
  );
}
