import { Proximamente } from "../../proximamente";

export const metadata = { title: "Portal cliente" };

export default function LoginCliente() {
  return (
    <Proximamente
      sufijo="Cliente"
      texto="El portal para clientes se habilita en la fase de portales."
    />
  );
}
