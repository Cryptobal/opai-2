import { LinkNext } from "@/app/_components/link-next";

/**
 * Pie del login: acceso al ingreso propio del trabajador (RUT y PIN). El cliente entra con su correo en
 * este mismo formulario hasta que exista su ingreso propio (CAR-347).
 */
export function PiePortales() {
  return (
    <LinkNext href="/trabajador/login" className="font-medium text-accent">
      Entrar como trabajador
    </LinkNext>
  );
}
