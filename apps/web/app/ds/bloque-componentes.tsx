"use client";

import { Building2, LogOut, MoreHorizontal, UserRound } from "lucide-react";
import { useState } from "react";

import { Button, Card, CardContent, CardHeader, CardTitle, Dialog, Menu, Switch } from "@opai/ds";

/** Menú, diálogo e interruptor (Brief 01). Provisionales hasta su diseño en Claude Design. */
export function BloqueComponentes() {
  const [dialogo, setDialogo] = useState(false);
  const [crm, setCrm] = useState(true);
  const [cpq, setCpq] = useState(false);
  const [elegido, setElegido] = useState("Ninguna acción");
  const items = [
    {
      id: "gard",
      grupo: "Empresa",
      etiqueta: "Gard Security",
      icono: Building2,
      marcado: true,
      onSelect: () => setElegido("Gard Security"),
    },
    {
      id: "aseos",
      etiqueta: "Aseos del Sur",
      icono: Building2,
      onSelect: () => setElegido("Aseos del Sur"),
    },
    {
      id: "perfil",
      grupo: "Cuenta",
      etiqueta: "Cambiar contraseña",
      icono: UserRound,
      onSelect: () => setElegido("Cambiar contraseña"),
    },
    {
      id: "salir",
      etiqueta: "Cerrar sesión",
      icono: LogOut,
      peligro: true,
      onSelect: () => setElegido("Cerrar sesión"),
    },
  ];
  return (
    <section className="flex flex-col gap-3">
      <h2 className="t-heading text-fg">Menú, diálogo e interruptor</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Menú</CardTitle>
            <Menu
              etiqueta="Más acciones"
              items={items}
              disparador={<MoreHorizontal className="size-5" />}
            />
          </CardHeader>
          <CardContent>
            <p className="text-base text-fg-muted">Elegido: {elegido}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Diálogo</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" onClick={() => setDialogo(true)}>
              Revocar API key
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Interruptor</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            <Switch etiqueta="Comercial" descripcion="Activo" activo={crm} onCambiar={setCrm} />
            <Switch
              etiqueta="CPQ"
              descripcion="Requiere Comercial"
              activo={cpq}
              onCambiar={setCpq}
            />
          </CardContent>
        </Card>
      </div>
      <Dialog
        abierto={dialogo}
        onCerrar={() => setDialogo(false)}
        titulo="¿Revocar la key Grokbot?"
        descripcion="Deja de funcionar de inmediato y no se puede deshacer."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setDialogo(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => setDialogo(false)}>
              Revocar
            </Button>
          </>
        }
      />
    </section>
  );
}
