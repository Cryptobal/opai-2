"use client";

import { Building2 } from "lucide-react";

import {
  Badge,
  Button,
  type EstadoPantalla,
  Estado,
  FilaSeleccionable,
  HerramientasLista,
  Input,
  MetaLista,
  MonoAv,
  SplitScreen,
} from "@opai/ds";

/** SplitScreen con el estado de la muestra (cargando, vacío, error, sin permisos). */
export function MuestraSplit({ state }: { state: EstadoPantalla }) {
  return (
    <SplitScreen
      incrustado
      telefono="lista"
      vacio={{ texto: "Elige una cuenta", icono: Building2 }}
      lista={
        <>
          <HerramientasLista>
            <Input id="buscar-split" placeholder="Buscar por nombre o RUT" aria-label="Buscar" />
          </HerramientasLista>
          <MetaLista izquierda="3 cuentas · 2 clientes activos" derecha="Nombre A–Z" />
          <div className="p-3 md:p-0">
            <Estado
              state={state}
              variante="lista"
              textos={{
                vacio: {
                  titulo: "Aún no hay cuentas",
                  descripcion:
                    "Crea la primera para registrar sus instalaciones, contactos y documentos.",
                  accion: <Button>Nueva cuenta</Button>,
                },
                error: { titulo: "No pudimos cargar las cuentas", onReintentar: () => undefined },
              }}
            >
              <FilaSeleccionable
                titulo="Logística Andina SpA"
                secundario="76.543.210-K · 3 instalaciones"
                inicio={<MonoAv texto="LA" seleccionada />}
                fin={<Badge tono="success">Activo</Badge>}
                seleccionada
              />
              <FilaSeleccionable
                titulo="Minera Cerro Alto SpA"
                secundario="76.998.001-7 · 1 instalación"
                inicio={<MonoAv texto="MC" />}
                fin={<Badge tono="info">Prospecto</Badge>}
              />
            </Estado>
          </div>
        </>
      }
    />
  );
}
