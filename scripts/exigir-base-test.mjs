if (!process.env.DATABASE_URL_TEST?.trim()) {
  console.error("Falta DATABASE_URL_TEST: test:db requiere Postgres real.");
  process.exit(1);
}
