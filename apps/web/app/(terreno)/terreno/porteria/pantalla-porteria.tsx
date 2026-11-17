"use client";

import dynamic from "next/dynamic";

import { Alerta, Button, Empty, Loading } from "@opai/ds";
import { LinkNext } from "@/app/_components/link-next";

import { usePersonaElegida } from "@/lib/terreno/persona";

import { BienvenidaPorteria } from "./bienvenida-porteria";
import { SelectorPunto, usePunto } from "./punto-porteria";
import { usarSitioPorteria } from "./usar-sitio-porteria";

const FormularioEntrada = dynamic(
  () => import("./formulario-entrada").then((m) => m.FormularioEntrada),
  { ssr: false },
);
const Esperados = dynamic(() => import("./esperados").then((m) => m.Esperados), { ssr: false });
const ListaEnSitio = dynamic(() => import("./lista-en-sitio").then((m) => m.ListaEnSitio), {
  ssr: false,
});
const ExportarEvacuacion = dynamic(
  () => import("./exportar-evacuacion").then((m) => m.ExportarEvacuacion),
  { ssr: false },
);

/**
 * Portería del equipo de terreno (CAR-78 · E4d; CAR-631 · R26): registrar con copia cifrada para evacuación sin red.
 */
export function PantallaPorteria() {
  const persona = usePersonaElegida();
  const { sitio, copia, sinRed, falla, enLinea, recargar } = usarSitioPorteria();
  const punto = usePunto(sitio?.puntos ?? []);

  if (persona === undefined) return null;
  if (!persona) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6 pt-safe pb-safe">
        <Alerta tono="warning" titulo="Elige tu nombre primero">
          La portería necesita saber quién registra.
        </Alerta>
        <LinkNext href="/terreno" className="font-medium underline">
          Volver al inicio
        </LinkNext>
      </main>
    );
  }
  const muestraPorteria = !sitio || sitio.activo;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6 pt-safe pb-safe">
      <h1 className="t-title text-fg">Portería</h1>
      <BienvenidaPorteria b={sitio?.bienvenida ?? null} />
      <SelectorPunto puntos={sitio?.puntos ?? []} id={punto.id} onElegir={punto.elegir} />
      {!sitio && !falla ? <Loading variante="lista" /> : null}
      {sitio && !sitio.activo ? (
        <Empty
          titulo="Control de acceso no está activo"
          descripcion="Pide al administrador que lo active para tu empresa."
        />
      ) : null}
      {sinRed ? (
        <Alerta tono="info" titulo="Sin conexión">
          Ves la última lista en sitio guardada en este teléfono. Los registros que guardes se encolan hasta volver la
          señal.
        </Alerta>
      ) : null}
      {falla && !sinRed ? (
        <Alerta
          tono="warning"
          titulo={sitio ? "No se pudo actualizar" : "No se pudo cargar quién está en sitio"}
          accion={
            <Button variant="secondary" onClick={recargar}>
              Reintentar
            </Button>
          }
        >
          {sitio
            ? "Lo que ves puede estar desactualizado."
            : "Revisa tu conexión. Igual puedes registrar: queda guardado en el teléfono."}
        </Alerta>
      ) : null}
      {muestraPorteria ? (
        <>
          <Esperados personaId={persona.id} puntoId={punto.id} alRegistrar={recargar} />
          <FormularioEntrada
            personaId={persona.id}
            config={sitio?.config ?? null}
            puntoId={punto.id}
          />
          {sitio ? (
            <ListaEnSitio
              items={sitio.items}
              personaId={persona.id}
              permanenciaMaxMin={sitio.config?.permanenciaMaxMin ?? null}
            />
          ) : null}
          <ExportarEvacuacion copia={copia} enLinea={enLinea && !sinRed} />
        </>
      ) : null}
    </main>
  );
}