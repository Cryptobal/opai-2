import type { DatosHojas } from "./tipos";
import {
  HojaContactos,
  HojaEditar,
  HojaGanar,
  HojaInstalaciones,
  HojaMover,
  HojaNuevo,
  HojaPerder,
  HojaReabrir,
} from "./diferidas";

/**
 * Hojas de Negocios montadas por la URL: cada una se descarga solo con su parámetro presente y
 * recibe los datos que el servidor leyó para ella (`cargarHojas`). Sin datos, no monta nada.
 */
export function HojasNegocio({ h }: { h: DatosHojas | null }) {
  if (!h?.config) return null;
  const { config, negocio: n } = h;
  return (
    <>
      <HojaNuevo config={config} cuentas={h.cuentas} cuentaInicial={h.cuentaInicial} />
      {n ? (
        <>
          <HojaEditar n={n} config={config} />
          <HojaMover n={n} config={config} />
          <HojaGanar n={n} />
          <HojaPerder n={n} config={config} />
          <HojaReabrir n={n} config={config} />
          {h.cuenta ? (
            <>
              <HojaInstalaciones n={n} cuenta={h.cuenta} />
              <HojaContactos n={n} cuenta={h.cuenta} />
            </>
          ) : null}
        </>
      ) : null}
    </>
  );
}
