import { Tabs } from "@opai/ds";

const ETIQUETAS = [
  "Resumen",
  "Contactos",
  "Instalaciones",
  "Personas",
  "Documentos",
  "Actividad",
  "Contratos",
  "Facturas",
];

/**
 * Pestañas que no caben en 375 px, por ruta y con estado, para la prueba de que la barra solo se
 * desplaza en horizontal. `w-0 min-w-full` evita que las pestañas ensanchen la página.
 */
export function MuestraPestanas() {
  const tabs = ETIQUETAS.map((e) => ({ id: e.toLowerCase(), etiqueta: e, contenido: <p>{e}</p> }));
  return (
    <div className="flex flex-col gap-6">
      <div data-testid="pestanas-ruta" className="w-0 max-w-md min-w-full">
        <Tabs activa="resumen" tabs={tabs.map((t) => ({ ...t, href: `#${t.id}` }))} />
      </div>
      <div data-testid="pestanas-activa-lejos" className="w-0 max-w-md min-w-full">
        <Tabs activa="facturas" tabs={tabs.map((t) => ({ ...t, href: `#${t.id}` }))} />
      </div>
      <div data-testid="pestanas-estado" className="w-0 max-w-md min-w-full">
        <Tabs inicial="resumen" tabs={tabs} />
      </div>
    </div>
  );
}
