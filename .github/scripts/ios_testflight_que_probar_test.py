#!/usr/bin/env python3
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from ios_testflight_que_probar import archivo_relevante, armar_whats_new, extraer_que_probar


class QueProbarTests(unittest.TestCase):
    def test_extraer_seccion(self) -> None:
        cuerpo = "## Qué cambia\n\nFoo\n\n## Qué probar en la app\n\nEntrar con passkey.\n\n## Checks\n\nBar"
        self.assertEqual(extraer_que_probar(cuerpo), "Entrar con passkey.")

    def test_archivo_relevante(self) -> None:
        self.assertTrue(archivo_relevante("apps/movil/foo.ts"))
        self.assertTrue(archivo_relevante("packages/auth/x.ts"))
        self.assertTrue(archivo_relevante("apps/web/app/(auth)/login/page.tsx"))
        self.assertFalse(archivo_relevante("packages/db/foo.ts"))

    def test_armar_cabeza(self) -> None:
        import subprocess

        head = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
        texto = armar_whats_new(107, head)
        self.assertIn("Build 107 ·", texto)
        self.assertIn(f"commit {head[:7]}", texto)


if __name__ == "__main__":
    unittest.main()