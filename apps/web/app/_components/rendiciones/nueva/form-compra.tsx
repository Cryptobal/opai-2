"use client";

import { useState } from "react";

import { Button, Cabecera } from "@opai/ds";

import { type DetalleRendicion, type OpcionesRendicion, type PortalRendicion } from "../tipos";
import { AccionesEnvio } from "./acciones-envio";
import { BarraAcciones } from "./barra-acciones";
import {
  CamposEnvio,
  cuerpoComun,
  type DatosEnvio,
  envioDe,
  type ErroresEnvio,
  erroresDeEnvio,
} from "./datos-envio";
import {
  type ErroresGasto,
  type Gasto,
  gastoDe,
  gastoVacio,
  itemDe,
  totalDe,
  conGasto,
  type Paso,
  TITULO,
  validarGasto,
} from "./gasto";
import { useGuardado } from "./guardado";
import { PasoDatos } from "./paso-datos";
import { PasoDocumento } from "./paso-documento";
import { ResumenGastos } from "./resumen-gastos";

/** Nueva rendición de compra (o corrección de una devuelta): foto, datos, varios gastos con total corriente y envío con confirmación. */
export function FormCompra({
  portal,
  opciones,
  hoy,
  inicial,
}: {
  portal: PortalRendicion;
  opciones: OpcionesRendicion;
  hoy: string;
  inicial?: DetalleRendicion;
}) {
  const [gastos, setGastos] = useState<Gasto[]>(() => inicial?.items.map(gastoDe) ?? []);
  const [actual, setActual] = useState<Gasto | null>(() => (inicial ? null : gastoVacio(hoy)));
  const [paso, setPaso] = useState<Paso>(inicial ? "resumen" : "documento");
  const [errores, setErrores] = useState<ErroresGasto>({});
  const [envio, setEnvio] = useState<DatosEnvio>(() => envioDe(opciones, inicial));
  const [erroresEnvio, setErroresEnvio] = useState<ErroresEnvio>({});
  const g = useGuardado(portal, inicial?.id);

  const siguiente = (a: Paso) => {
    if (!actual) return;
    const e = validarGasto(actual, hoy, opciones.exigirRespaldo);
    const aMostrar: ErroresGasto =
      a === "datos" ? (e.documento ? { documento: e.documento } : {}) : e;
    if (Object.keys(aMostrar).length > 0) return setErrores(aMostrar);
    setErrores({});
    if (a === "resumen") {
      setGastos((l) => conGasto(l, actual));
      setActual(null);
    }
    setPaso(a);
  };
  const otro = () => {
    setActual(gastoVacio(hoy));
    setErrores({});
    setPaso("documento");
  };

  const cuerpo = () => ({ tipo: "compra", ...cuerpoComun(envio), items: gastos.map(itemDe) });
  const validarEnvio = (enviar: boolean) => {
    const e = erroresDeEnvio(envio, enviar, gastos.length);
    setErroresEnvio(e);
    return Object.keys(e).length === 0;
  };
  const aprobador =
    opciones.aprobadores.find((a) => a.id === envio.aprobadorId)?.nombre ?? "el aprobador";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Cabecera
        titulo={TITULO[paso]}
        subtitulo={inicial ? `Corrigiendo ${inicial.codigoVisible}` : undefined}
        tituloSiempre
      />
      {paso === "documento" && actual ? (
        <>
          <PasoDocumento
            gasto={actual}
            onCambiar={setActual}
            destino={opciones.destinoRespaldo}
            portal={portal}
            errores={errores}
          />
          <BarraAcciones>
            {gastos.length > 0 ? (
              <Button variant="secondary" onClick={() => setPaso("resumen")}>
                Volver al resumen
              </Button>
            ) : null}
            <Button onClick={() => siguiente("datos")}>Continuar</Button>
          </BarraAcciones>
        </>
      ) : null}
      {paso === "datos" && actual ? (
        <>
          <PasoDatos
            gasto={actual}
            onCambiar={setActual}
            errores={errores}
            portal={portal}
            {...(inicial ? { propiaId: inicial.id } : {})}
          />
          <BarraAcciones>
            <Button variant="secondary" onClick={() => setPaso("documento")}>
              Atrás
            </Button>
            <Button onClick={() => siguiente("resumen")}>Agregar gasto</Button>
          </BarraAcciones>
        </>
      ) : null}
      {paso === "resumen" ? (
        <>
          <ResumenGastos
            gastos={gastos}
            onEditar={(k) => {
              setActual(gastos.find((x) => x.clave === k) ?? null);
              setPaso("documento");
            }}
            onQuitar={(k) => setGastos((l) => l.filter((x) => x.clave !== k))}
          />
          <Button variant="secondary" onClick={otro}>
            + Agregar otro gasto
          </Button>
          <CamposEnvio
            valor={envio}
            onCambiar={setEnvio}
            opciones={opciones}
            errores={erroresEnvio}
          />
          <AccionesEnvio
            g={g}
            cuerpo={cuerpo}
            validar={validarEnvio}
            aprobadorId={envio.aprobadorId}
            aprobador={aprobador}
            total={totalDe(gastos)}
            gastos={gastos.length}
          />
        </>
      ) : null}
    </div>
  );
}
