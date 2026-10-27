/**
 * Cookie con el portal elegido en la entrada, guardada solo en este dispositivo (D1 del Brief 04).
 * Vive en un módulo sin "use client" para que el servidor (`page.tsx`) lea el valor real al resolver
 * `/entrar`; si estuviera en el módulo cliente, el servidor recibiría una referencia de cliente y no
 * la cadena, y la preferencia nunca se aplicaría.
 */
export const COOKIE_PORTAL = "opai_portal";
