import { redirect } from "next/navigation";

export const metadata = { title: "Portal cliente" };

/**
 * Hoy el cliente entra con su correo en el ingreso común (CAR-300) y la app lo lleva a su portal. Mientras
 * no exista su ingreso propio (enlace mágico o RUT y PIN, diseño `export-base-hilo/Acceso`, etapa H5),
 * esta dirección lleva ahí en vez de mostrar «Próximamente» (CAR-347).
 */
export default function LoginCliente() {
  redirect("/login?next=%2Fcliente");
}
