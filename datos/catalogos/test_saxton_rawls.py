"""Pruebas de saxton_rawls.py contra la Tabla 3 del articulo (Saxton y Rawls, 2006, SSSAJ 70(5): 1577).

Ejecutar desde la raiz:  python -m unittest discover -s datos/catalogos
Los valores publicados estan redondeados a enteros (humedad, en %v), de ahi la tolerancia de 0.55 puntos.
"""
import unittest

import saxton_rawls as sr

# Clase, arena %w, arcilla %w, marchitez 1500 kPa, capacidad de campo 33 kPa, saturacion, agua disponible (todos %v).
# Materia organica de la tabla: 2.5 %w, sin salinidad, grava ni ajuste de densidad.
TABLA_3 = [
    ("Sa", 88, 5, 5, 10, 46, 5), ("LSa", 80, 5, 5, 12, 46, 7), ("SaL", 65, 10, 8, 18, 45, 10),
    ("L", 40, 20, 14, 28, 46, 14), ("SiL", 20, 15, 11, 31, 48, 20), ("Si", 10, 5, 6, 30, 48, 25),
    ("SaCL", 60, 25, 17, 27, 43, 10), ("CL", 30, 35, 22, 36, 48, 14), ("SiCL", 10, 35, 22, 38, 51, 17),
    ("SiC", 10, 45, 27, 41, 52, 14), ("SaC", 50, 40, 25, 36, 44, 11), ("C", 25, 50, 30, 42, 50, 12),
]
TOLERANCIA = 0.55


def citado(valor, nombre="prueba"):
    return {"estado": "EVALUABLE", "valor": valor, "unidad": "%", "fuente": {"nombre": nombre}}


class TablaPublicada(unittest.TestCase):
    def test_reproduce_la_tabla_3_del_articulo(self):
        for clase, arena, arcilla, wp, fc, sat, paw in TABLA_3:
            with self.subTest(clase=clase):
                r = sr.retencion(arena, arcilla, 2.5)
                self.assertAlmostEqual(r["thetaWp"] * 100, wp, delta=TOLERANCIA)
                self.assertAlmostEqual(r["thetaFc"] * 100, fc, delta=TOLERANCIA)
                self.assertAlmostEqual(r["thetaSat"] * 100, sat, delta=TOLERANCIA)
                self.assertAlmostEqual((r["thetaFc"] - r["thetaWp"]) * 100, paw, delta=TOLERANCIA)

    def test_la_materia_organica_va_en_porcentaje_no_en_fraccion(self):
        # Con la materia organica dividida entre 100 la saturacion del franco se alejaba 6 puntos de la tabla.
        r = sr.retencion(40, 20, 2.5)
        self.assertGreater(r["thetaSat"] * 100, 45)
        self.assertLess(r["thetaSat"] * 100, 47)

    def test_taw_es_capacidad_de_campo_menos_marchitez(self):
        r = sr.retencion(40, 20, 2.5)
        self.assertAlmostEqual(r["tawMmPorM"], 1000 * (r["thetaFc"] - r["thetaWp"]))

    def test_mas_materia_organica_retiene_mas_agua_util_en_suelo_arenoso(self):
        self.assertGreater(sr.retencion(65, 10, 4)["tawMmPorM"], sr.retencion(65, 10, 1)["tawMmPorM"])


class Entradas(unittest.TestCase):
    def test_rechaza_valores_invalidos(self):
        for args in ((-1, 10, 2), (50, 101, 2), (70, 40, 2), (50, 10, float("nan")), (50, 10, "2")):
            with self.subTest(args=args), self.assertRaises(ValueError):
                sr.retencion(*args)

    def test_no_extrapola_fuera_del_rango_del_articulo(self):
        with self.assertRaises(ValueError):
            sr.retencion(30, 20, 9)      # materia organica > 8 %
        with self.assertRaises(ValueError):
            sr.retencion(10, 65, 2)      # arcilla > 60 %


class ObjetoAgua(unittest.TestCase):
    def test_evaluable_declara_metodo_retencion_y_supuesto(self):
        a = sr.agua_pedotransferencia("est-1", citado(60, "SoilGrids"), citado(25, "SoilGrids"), citado(2.5, "SoilGrids"))
        self.assertEqual(a["tawMmPorM"]["estado"], "EVALUABLE")
        self.assertEqual(a["tawMmPorM"]["unidad"], "mm/m")
        self.assertEqual(a["tawMmPorM"]["etiqueta"], "SUPUESTO")
        self.assertEqual(a["metodoTaw"]["metodo"], "pedotransferencia_saxton_rawls_2006")
        self.assertEqual(a["metodoTaw"]["etiqueta"], "SUPUESTO")
        self.assertEqual(a["metodoTaw"]["entradas"]["estimacionId"], "est-1")
        self.assertEqual(a["metodoTaw"]["entradas"]["arenaPct"]["fuente"]["nombre"], "SoilGrids")
        self.assertEqual(set(a["retencion"]), {"thetaSatM3M3", "thetaFcM3M3", "thetaWpM3M3"})
        self.assertTrue(a["retencion"]["thetaWpM3M3"]["valor"] < a["retencion"]["thetaFcM3M3"]["valor"] < a["retencion"]["thetaSatM3M3"]["valor"])

    def test_entrada_faltante_es_no_evaluable_sin_numero_por_defecto(self):
        falta = {"estado": "NO_EVALUABLE", "motivo": "sin dato"}
        a = sr.agua_pedotransferencia("est-1", citado(60), citado(25), falta)
        self.assertEqual(a["tawMmPorM"]["estado"], "NO_EVALUABLE")
        self.assertIn("materiaOrganicaPct", a["tawMmPorM"]["motivo"])
        self.assertNotIn("metodoTaw", a)
        self.assertNotIn("valor", a["tawMmPorM"])

    def test_fuera_de_rango_es_no_evaluable_con_motivo(self):
        a = sr.agua_pedotransferencia("est-1", citado(10), citado(65), citado(2))
        self.assertEqual(a["tawMmPorM"]["estado"], "NO_EVALUABLE")
        self.assertIn("no aplica", a["tawMmPorM"]["motivo"])
        self.assertNotIn("metodoTaw", a)


if __name__ == "__main__":
    unittest.main()
