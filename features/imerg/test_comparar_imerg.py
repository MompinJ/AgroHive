"""Pruebas del prototipo IMERG: python3 -m unittest discover -s features/imerg"""

import unittest
from datetime import date

import comparar_imerg as ci


def respuesta(valores: dict[str, float], parametro: str = "IMERG_PRECTOT") -> dict:
    return {"header": {"fill_value": -999.0}, "properties": {"parameter": {parametro: valores}}}


class PruebasImerg(unittest.TestCase):
    def test_relleno_es_none_nunca_cero(self):
        s = ci.serie(respuesta({"20230601": -999.0, "20230602": 0.0, "20230603": 57.67}), "IMERG_PRECTOT")
        self.assertIsNone(s[date(2023, 6, 1)])
        self.assertEqual(s[date(2023, 6, 2)], 0.0)
        self.assertEqual(s[date(2023, 6, 3)], 57.67)

    def test_anio_agricola_de_siap(self):
        self.assertEqual(ci.anio_agricola(date(2022, 10, 1)), 2023)
        self.assertEqual(ci.anio_agricola(date(2023, 9, 30)), 2023)
        self.assertEqual(len(ci.dias_del_anio_agricola(2024)), 366)  # 2024 es bisiesto

    def test_percentil_tipo7_como_numpy(self):
        # numpy.percentile([1, 2, 3, 4], [10, 50, 90]) = [1.3, 2.5, 3.7]
        for p, esperado in ((0.1, 1.3), (0.5, 2.5), (0.9, 3.7)):
            self.assertAlmostEqual(ci.percentil_tipo7([4.0, 1.0, 3.0, 2.0], p), esperado)

    def test_empate_gana_el_mas_reciente(self):
        self.assertEqual(ci.anio_mas_cercano({2008: 100.0, 2016: 100.02, 2020: 150.0}, 100.0), 2016)
        self.assertEqual(ci.anio_mas_cercano({2008: 100.0, 2016: 101.0}, 100.0), 2008)

    def test_anio_incompleto_no_se_rellena(self):
        s = {d: 1.0 for d in ci.dias_del_anio_agricola(2023)}
        self.assertEqual(ci.resumen_anio(s, 2023)["totalMm"], 365.0)
        s[date(2023, 1, 15)] = None
        self.assertIsNone(ci.resumen_anio(s, 2023))

    def test_rangos_smn(self):
        s = {d: 0.0 for d in ci.dias_del_anio_agricola(2023)}
        s[date(2023, 6, 5)], s[date(2023, 6, 6)], s[date(2023, 6, 7)] = 25.0, 74.9, 200.0
        r = ci.resumen_anio(s, 2023)["diasPorRango"]
        self.assertEqual(r, {"fuerte": 1, "muy_fuerte": 1, "intensa": 0, "torrencial": 1})


if __name__ == "__main__":
    unittest.main()
