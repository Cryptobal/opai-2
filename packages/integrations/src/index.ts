// Adaptadores del núcleo (ADR-008, ADR-027, ADR-031): correo, almacenamiento, geolocalización, IA y
// secretos por tenant. Nunca SDKs de proveedores: todo por HTTP y medido por el núcleo.
export * from "./almacenamiento/r2";
export * from "./catalogo";
export * from "./email";
export * from "./geo/google";
export * from "./ia/proveedores";
export * from "./secretos/cifrado";
