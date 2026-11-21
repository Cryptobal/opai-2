"use client";

import { Alerta, Button, Empty, Loading } from "@opai/ds";
import { LinkNext } from "@/app/_components/link-next";

import { usePersonaElegida } from "@/lib/terreno/persona";

import { ReportarNovedad } from "../_componentes/reportar-novedad";
import { ListaLibro } from "./lista-libro";
import { useLibro } from "./usar-libro";

const MARCO = "mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6 pt-safe pb-safe";

/**
 * Libro de novedades de la instalación en el equipo de terreno (CAR-77 parte 3, export-terreno «Libro Novedades»):
 * «Nueva novedad», que va a la cola del teléfono, y las últimas novedades con su número, hora y gravedad.
 */
export function PantallaLibro() {
  const persona = usePersonaElegida();
  const { items, falla, recargar } = useLibro();
  if (persona === undefined) return null;
  if (!persona) {
    return (
      <main className={MARCO}>
        <Alerta tono="warning" titulo="Elige tu nombre primero">
          El libro necesita saber quién escribe cada novedad.
        </Alerta>
        <LinkNext href="/terreno" className="font-medium underline">
          Volver al inicio
        </LinkNext>
      </main>
    );
  }
  return (
    <main className={MARCO}>
      <h1 className="t-title text-fg">Libro de novedades</h1>
      <ReportarNovedad personaId={persona.id} desdeLibro alGuardar={recargar} />
      {!items && !falla ? <Loading variante="lista" /> : null}
      {falla ? (
        <Alerta
          tono="warning"
          titulo={items ? "No se pudo actualizar" : "No se pudo cargar el libro"}
          accion={
            <Button variant="secondary" onClick={recargar}>
              Reintentar
            </Button>
          }
        >
          {items ? "Lo que ves puede estar desactualizado." : "Revisa tu conexión."}
        </Alerta>
      ) : null}
      {items?.length === 0 ? (
        <Empty
          titulo="Sin novedades"
          descripcion="Lo que anotes aquí queda en el libro de la instalación."
        />
      ) : null}
      {items && items.length > 0 ? <ListaLibro items={items} personaId={persona.id} /> : null}
    </main>
  );
}
