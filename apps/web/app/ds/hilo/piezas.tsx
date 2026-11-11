"use client";

import { useState } from "react";

import { Badge, Button, Campo, Card, CardContent, Input, Select, Table, Tabs, Td, Th, Tr } from "@opai/ds";

const FILAS = [
  ["Servicios Andes SpA", "Cliente", "success", "UF 380"],
  ["Constructora Lira", "En revisión", "warning", "UF 145"],
  ["Logística Sur", "Inactiva", "danger", "UF 0"],
] as const;

const Titulo = ({ children }: { children: string }) => <h2 className="t-overline text-fg-muted">{children}</h2>;

/**
 * Las piezas de una pantalla por dentro, con la piel del marco Hilo (ADR-090): botones, campos,
 * etiquetas de estado, pestañas y tabla. Datos ficticios; se compara con «Piezas y estados del
 * diseño» de docs/2.0/design/export-base-hilo/.
 */
export function PiezasHilo() {
  const [giro, setGiro] = useState<string | undefined>("seguridad");
  return (
    <div className="flex max-w-[900px] flex-col gap-8">
      <section className="flex flex-col gap-3">
        <Titulo>Acciones</Titulo>
        <div className="flex flex-wrap gap-2">
          <Button data-testid="pieza-boton">Guardar cambios</Button>
          <Button variant="secondary">Cancelar</Button>
          <Button variant="ghost">Ver historial</Button>
          <Button variant="destructive">Eliminar</Button>
          <Button disabled>Sin permiso</Button>
          <Button cargando>Guardando</Button>
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <Titulo>Campos</Titulo>
        <div className="grid gap-4 md:grid-cols-2">
          <Campo etiqueta="Razón social" htmlFor="pieza-razon">
            <Input id="pieza-razon" data-testid="pieza-campo" defaultValue="Servicios Andes SpA" />
          </Campo>
          <Campo etiqueta="Giro" htmlFor="pieza-giro">
            <Select
              id="pieza-giro"
              valor={giro}
              onCambiar={setGiro}
              opciones={[
                { valor: "seguridad", etiqueta: "Seguridad privada" },
                { valor: "aseo", etiqueta: "Aseo industrial" },
              ]}
            />
          </Campo>
          <Campo etiqueta="Correo de facturación" htmlFor="pieza-correo" error="Escribe un correo válido.">
            <Input id="pieza-correo" aria-invalid defaultValue="facturas@" />
          </Campo>
          <Campo etiqueta="Teléfono" htmlFor="pieza-fono" ayuda="Con código de país.">
            <Input id="pieza-fono" placeholder="+56 9 1234 5678" />
          </Campo>
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <Titulo>Estados</Titulo>
        <div className="flex flex-wrap gap-2">
          <Badge tono="success" data-testid="pieza-etiqueta">
            Vigente
          </Badge>
          <Badge tono="warning">Por vencer</Badge>
          <Badge tono="danger">Vencida</Badge>
          <Badge tono="info">En curso</Badge>
          <Badge>Borrador</Badge>
          <Badge tono="accent">Propuesto por el agente</Badge>
        </div>
      </section>
      <section className="flex flex-col gap-3">
        <Titulo>Pestañas y tabla</Titulo>
        <Tabs
          inicial="cuentas"
          tabs={[
            {
              id: "cuentas",
              etiqueta: "Cuentas",
              contenido: (
                <Table data-testid="pieza-tabla">
                  <thead>
                    <tr>
                      <Th>Cuenta</Th>
                      <Th>Estado</Th>
                      <Th className="text-right">Mensual</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {FILAS.map(([nombre, estado, tono, monto]) => (
                      <Tr key={nombre}>
                        <Td className="font-medium">{nombre}</Td>
                        <Td>
                          <Badge tono={tono}>{estado}</Badge>
                        </Td>
                        <Td className="t-numeric text-right">{monto}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              ),
            },
            { id: "contactos", etiqueta: "Contactos", contenido: <p className="text-fg-muted">Sin contactos.</p> },
          ]}
        />
      </section>
      <Card>
        <CardContent className="flex flex-col gap-1 p-4">
          <span className="t-label text-fg">Tarjeta</span>
          <span className="text-base text-fg-muted">Borde de una línea y radio de 16 px, sin sombra.</span>
        </CardContent>
      </Card>
    </div>
  );
}
