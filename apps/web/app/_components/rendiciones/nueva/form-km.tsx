"use client";

import { useState } from "react";

import { Cabecera, Campo, InputFecha, Select, Switch } from "@opai/ds";

import type { DetalleRendicion, OpcionesRendicion, PortalRendicion } from "../tipos";
import { DesgloseKm, SinKilometraje, useCalculoKm } from "./calculo-km";
import { AccionesEnvio } from "./acciones-envio";
import { CampoPeaje } from "./campo-peaje";
import { CamposEnvio, cuerpoComun, type DatosEnvio, envioDe, erroresDeEnvio } from "./datos-envio";
import { useGuardado } from "./guardado";
import { CampoLugar, type Lugar } from "./lugar";

/** Nueva rendición de kilometraje (o su corrección): el monto sale siempre de `rendiciones.kilometraje.calcular`. */
export function FormKm({
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
  const v = inicial?.viaje ?? null;
  const [origen, setOrigen] = useState<Lugar | null>(
    v && { texto: v.origen, lat: v.origenLat, lng: v.origenLng },
  );
  const [destino, setDestino] = useState<Lugar | null>(
    v && { texto: v.destino, lat: v.destinoLat, lng: v.destinoLng },
  );
  const [idaYVuelta, setIda] = useState(v?.idaYVuelta ?? false);
  const [peaje, setPeaje] = useState(String(v?.peajeClp || ""));
  const [fotoPeaje, setFotoPeaje] = useState<string | null>(inicial?.items[0]?.documentoId ?? null);
  const [tramo, setTramo] = useState(v?.tramo ?? "");
  const [fecha, setFecha] = useState(v?.fecha ?? hoy);
  const [envio, setEnvio] = useState<DatosEnvio>(() => envioDe(opciones, inicial));
  const [errores, setErrores] = useState<Partial<Record<keyof DatosEnvio | "viaje", string>>>({});
  const g = useGuardado(portal, inicial?.id);
  const km = opciones.kilometraje;
  const peajeClp = Number(peaje) || 0;
  const { calculo, error, calculando } = useCalculoKm(
    { origen, destino, idaYVuelta, peajeClp, tramo, fecha },
    portal,
    km?.metodo === "tramo_fijo",
  );

  if (!km) return <SinKilometraje />;

  const cuerpo = () => ({
    tipo: "kilometraje",
    ...cuerpoComun(envio),
    viaje: {
      origen,
      destino,
      idaYVuelta,
      peajeClp,
      fecha,
      ...(tramo ? { tramo } : {}),
      ...(peajeClp > 0 && fotoPeaje ? { peajeDocumentoId: fotoPeaje } : {}),
    },
  });
  const validar = (enviar: boolean) => {
    const e: typeof errores = erroresDeEnvio(envio, enviar);
    if (fecha > hoy) e.viaje = "La fecha del viaje no puede ser futura.";
    else if (!calculo) e.viaje = error ?? "Completa el viaje para calcular el monto.";
    setErrores(e);
    return Object.keys(e).length === 0;
  };
  const aprobador =
    opciones.aprobadores.find((a) => a.id === envio.aprobadorId)?.nombre ?? "el aprobador";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Cabecera
        titulo="Rendición de kilometraje"
        subtitulo={inicial ? `Corrigiendo ${inicial.codigoVisible}` : undefined}
        tituloSiempre
      />
      <CampoLugar
        etiqueta="Origen"
        id="km-origen"
        valor={origen}
        onCambiar={setOrigen}
        instalaciones={opciones.instalaciones}
        portal={portal}
      />
      <CampoLugar
        etiqueta="Destino"
        id="km-destino"
        valor={destino}
        onCambiar={setDestino}
        instalaciones={opciones.instalaciones}
        portal={portal}
      />
      <Campo etiqueta="Fecha del viaje" htmlFor="km-fecha">
        <InputFecha id="km-fecha" valor={fecha} onCambiar={setFecha} />
      </Campo>
      {km.metodo === "tramo_fijo" ? (
        <Campo etiqueta="Tramo" htmlFor="km-tramo">
          <Select
            id="km-tramo"
            valor={tramo || undefined}
            placeholder="Elige el tramo"
            opciones={km.tramos.map((t) => ({ valor: t.nombre, etiqueta: t.nombre }))}
            onCambiar={setTramo}
          />
        </Campo>
      ) : null}
      <Switch
        activo={idaYVuelta}
        onCambiar={setIda}
        etiqueta="Ida y vuelta"
        descripcion="Cuenta el trayecto dos veces."
      />
      <CampoPeaje
        valor={peaje}
        onCambiar={setPeaje}
        onFoto={setFotoPeaje}
        destino={opciones.destinoRespaldo}
        portal={portal}
      />
      <DesgloseKm calculo={calculo} calculando={calculando} />
      {error ? (
        <p role="alert" className="text-base font-medium text-danger-fg">
          {error}
        </p>
      ) : null}
      {errores.viaje && !error ? (
        <p role="alert" className="text-base font-medium text-danger-fg">
          {errores.viaje}
        </p>
      ) : null}
      <CamposEnvio valor={envio} onCambiar={setEnvio} opciones={opciones} errores={errores} />
      <AccionesEnvio
        g={g}
        cuerpo={cuerpo}
        validar={validar}
        aprobadorId={envio.aprobadorId}
        aprobador={aprobador}
        total={calculo?.montoClp ?? 0}
        gastos={1}
      />
    </div>
  );
}
