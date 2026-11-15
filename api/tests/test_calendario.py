"""A4.13, calendario MUNDIAL (15/11): GGCMI fase 3 es la base en cualquier coordenada, tambien en Mexico; Isla (SIAP/INIFAP)
se suma encima. Lo que no tiene fuente mundial queda NO_EVALUABLE con motivo; el frijol no se lee de bea_rf."""
import json

import pytest
from fastapi.testclient import TestClient

from app import calendario
from app.main import app

cliente = TestClient(app)
DOI = "10.5281/zenodo.5062513"
CON_GGCMI = {"maiz", "sorgo", "soya", "cacahuate", "trigo", "cebada", "papa", "yuca", "cana", "girasol", "algodon",
             "chicharo", "maiz_dulce", "frijol", "ejote"}
PULSES = {"caupi", "haba", "lenteja"}  # MIRCA2000, clase agregada Pulses
EQUIVALENCIAS = {"chicharo", "maiz_dulce", "frijol", "ejote"} | PULSES
FAO = {"KE"}  # paises de prueba que estan en FAO Crop Calendar
MIRCA_PRESENCIA = {"maiz", "trigo", "cebada", "sorgo", "soya", "girasol", "papa", "yuca", "cana", "cacahuate", "algodon"}


def _entrada(cuerpo, cultivo, temporada):
    return next(e for e in cuerpo["entradas"] if e["cultivo"] == cultivo and e["temporada"] == temporada)


def _con_ventana(cuerpo) -> dict:
    return {e["cultivo"]: e for e in cuerpo["entradas"] if e["ventana"]["estado"] == "EVALUABLE"}


def _ids_catalogo():
    return [c["id"] for c in json.loads((calendario.config.RAIZ / "datos" / "catalogos" / "cultivos.json").read_text())["cultivos"]]


# Puntos en varios continentes: (lat, lon, pais ISO, dia de siembra esperado del maiz de temporal en GGCMI (mes, dia, temporada)).
# Los dias salen del extracto de GGCMI fase 3 (datos/calendario/ggcmi-rf.npz) leidos el 15/11.
PUNTOS = {
    "mexico-cdmx": (19.43, -99.13, "MX", (6, 1, "PV")),  # alcaldia urbana, sin pareja en SIAP
    "mexico-sinaloa": (24.80, -107.39, "MX", (7, 1, "PV")),  # Culiacan
    "ee-uu-iowa": (42.0, -93.5, "US", (5, 13, "PV")),
    "brasil-mato-grosso": (-12.5, -55.5, "BR", (2, 14, "OI")),
    "kenia": (-0.5, 36.8, "KE", (10, 17, "OI")),
    "india-madhya-pradesh": (23.2, 77.4, "IN", (6, 26, "PV")),
    "espana-castilla": (40.0, -4.0, "ES", (4, 1, "PV")),
    "australia-nsw": (-33.0, 148.0, "AU", (12, 30, "OI")),
}


@pytest.mark.parametrize("nombre", PUNTOS)
def test_base_mundial_en_varios_continentes(nombre, validar):
    lat, lon, iso, (mes, dia, temporada) = PUNTOS[nombre]
    cuerpo = cliente.get("/api/calendario", params={"lat": lat, "lon": lon}).json()
    validar(cuerpo, "calendario-local#")
    assert cuerpo["ubicacion"]["paisIso"] == iso
    assert cuerpo["id"].startswith(f"calendario-ggcmi-{iso.lower()}-" if iso != "MX" or nombre == "mexico-cdmx" else "calendario-mx-")
    # Cada cultivo del catalogo trae PV y OI, sin repetir.
    claves = [(e["cultivo"], e["temporada"]) for e in cuerpo["entradas"]]
    assert len(claves) == len(set(claves)) == 2 * len(_ids_catalogo())
    con = _con_ventana(cuerpo)
    if iso in FAO:  # FAO Crop Calendar suma cultivos encima de la base
        assert set(con) > CON_GGCMI | PULSES
        return
    assert set(con) == CON_GGCMI | PULSES  # todos los puntos de prueba tienen Pulses de temporal en MIRCA2000
    for cultivo, e in con.items():
        assert e["estado"] == "EXPLORATORIO"
        assert (DOI if cultivo in CON_GGCMI else "10.5281/zenodo.7422506") in e["ventana"]["fuente"]["cita"]
        assert ("SUPUESTO" in e["motivo"]) == (cultivo in EQUIVALENCIAS)
        if cultivo in CON_GGCMI:  # un solo ciclo por celda: la otra temporada no tiene dato
            otra = _entrada(cuerpo, cultivo, "OI" if e["temporada"] == "PV" else "PV")
            assert otra["estado"] == "NO_EVALUABLE" and otra["ventana"]["estado"] == "NO_EVALUABLE"
        else:  # MIRCA da meses: la ventana es el mes de inicio entero
            assert e["ventana"]["desdeMes"] == e["ventana"]["hastaMes"] and "desdeDia" not in e["ventana"]
        # Presencia: SIAP en municipios de Mexico, MIRCA2000 en el resto para las clases propias, nunca para equivalencias.
        if cultivo in EQUIVALENCIAS:
            assert e["presencia"]["estado"] == "sin_dato" or "SIAP" in e["presencia"]["fuente"]["nombre"]
        elif iso != "MX" or nombre == "mexico-cdmx":
            assert e["presencia"]["estado"] in ("registrado", "no_registrado") and "MIRCA2000" in e["presencia"]["fuente"]["nombre"]
    maiz = _entrada(cuerpo, "maiz", temporada)
    assert (maiz["ventana"]["desdeMes"], maiz["ventana"]["desdeDia"]) == (mes, dia)
    assert maiz["ventana"]["desdeMes"] == maiz["ventana"]["hastaMes"] and maiz["ventana"]["desdeDia"] == maiz["ventana"]["hastaDia"]
    assert "Madurez" in maiz["ventana"]["fuente"]["nota"]
    # Sin fuente mundial: NO_EVALUABLE con motivo, nunca el calendario de otro cultivo.
    for cultivo in set(_ids_catalogo()) - CON_GGCMI - PULSES:
        for t in ("PV", "OI"):
            e = _entrada(cuerpo, cultivo, t)
            assert e["estado"] == "NO_EVALUABLE" and e["motivo"]
    assert all("bea_rf" in e["motivo"] and "Beans" in e["motivo"] for e in cuerpo["entradas"] if e["cultivo"] in ("frijol", "ejote") and e["estado"] != "NO_EVALUABLE")
    assert any(a["codigo"] == "CALENDARIO_BASE_MUNDIAL" for a in cuerpo["advertencias"])


def test_kenia_fao_crop_calendar_encima_de_la_base(validar):
    cuerpo = cliente.get("/api/calendario", params={"lat": -0.5, "lon": 36.8}).json()
    validar(cuerpo, "calendario-local#")
    con = _con_ventana(cuerpo)
    # Hortalizas y otros que ninguna fuente CC BY trae: vienen de FAO, con su licencia en la cita.
    for cultivo in ("tomate", "cebolla", "zanahoria", "col", "camote"):
        assert cultivo in con, cultivo
        f = con[cultivo]["ventana"]["fuente"]
        assert f["nombre"].startswith("FAO, Crop Calendar") and "CC BY-NC-SA 4.0" in f["cita"]
        assert "union" in f["nota"] and "riego" in f["nota"]
    tomate = _entrada(cuerpo, "tomate", "PV")["ventana"]
    assert (tomate["desdeMes"], tomate["desdeDia"], tomate["hastaMes"], tomate["hastaDia"]) == (7, 31, 10, 15)
    # Donde coinciden, FAO va encima de GGCMI y lo dice.
    sorgo = _entrada(cuerpo, "sorgo", "PV")["ventana"]
    assert sorgo["fuente"]["nombre"].startswith("FAO") and "GGCMI" in sorgo["fuente"]["nota"]
    # Sin FAO para el cultivo, se queda la base: FAO no trae maiz de grano en Kenia, el maiz OI es de GGCMI.
    assert DOI in _entrada(cuerpo, "maiz", "OI")["ventana"]["fuente"]["cita"]
    codigos = {a["codigo"] for a in cuerpo["advertencias"]}
    assert {"FAO_CROP_CALENDAR_NC_SA", "CALENDARIO_RESUMEN"} <= codigos
    assert len(con) == 23


def test_sin_la_carpeta_de_fao_la_api_sigue(monkeypatch, tmp_path, validar):
    import shutil
    for nombre in ("paises-110m.json", "ggcmi-rf.npz", "mirca-rf.npz", "siap-mexico.npz", "siap-mexico.json"):
        shutil.copy(calendario.config.CALENDARIO_DIR / nombre, tmp_path / nombre)
    monkeypatch.setattr(calendario.config, "CALENDARIO_DIR", tmp_path)
    for f in (calendario._fao, calendario._ggcmi, calendario._mirca, calendario._siap, calendario._paises):
        f.cache_clear()
    try:
        cuerpo = calendario.armar(36.8, -0.5)
        validar(cuerpo, "calendario-local#")
        assert "FAO, Crop Calendar" not in json.dumps(cuerpo)
        assert len(_con_ventana(cuerpo)) == len(CON_GGCMI | PULSES)
    finally:
        monkeypatch.undo()
        for f in (calendario._fao, calendario._ggcmi, calendario._mirca, calendario._siap, calendario._paises):
            f.cache_clear()


def test_fuera_de_fao_no_hay_ventanas_de_fao(validar):
    cuerpo = cliente.get("/api/calendario", params={"lat": 42.0, "lon": -93.5}).json()
    assert "FAO, Crop Calendar" not in json.dumps(cuerpo)


def test_india_lenteja_de_rabi_y_maiz_registrado_en_mirca(validar):
    cuerpo = cliente.get("/api/calendario", params={"lat": 23.2, "lon": 77.4}).json()
    validar(cuerpo, "calendario-local#")
    lenteja = _entrada(cuerpo, "lenteja", "OI")
    assert lenteja["ventana"]["estado"] == "EVALUABLE" and lenteja["ventana"]["desdeMes"] == 10
    assert "Pulses" in lenteja["motivo"] and "SUPUESTO" in lenteja["motivo"]
    assert _entrada(cuerpo, "lenteja", "PV")["estado"] == "NO_EVALUABLE"
    maiz = _entrada(cuerpo, "maiz", "PV")
    assert maiz["presencia"]["estado"] == "registrado" and "ha cosechadas" in maiz["presencia"]["nota"]


def test_iowa_conserva_el_dia_de_ggcmi_y_declara_el_frijol(validar):
    cuerpo = cliente.get("/api/calendario", params={"lat": 42.0, "lon": -93.5}).json()
    validar(cuerpo, "calendario-local#")
    pv = _entrada(cuerpo, "maiz", "PV")
    assert pv["ventana"]["fuente"]["nombre"] == "GGCMI Phase 3 crop calendar v1.01, maize de temporal (mai_rf)"
    assert "Duracion" in pv["ventana"]["fuente"]["nota"]
    soya = _entrada(cuerpo, "soya", "PV")
    assert soya["ventana"]["estado"] == "EVALUABLE" and "(soy_rf)" in soya["ventana"]["fuente"]["nombre"]
    assert all(e["estado"] == "NO_EVALUABLE" for e in cuerpo["entradas"] if e["cultivo"] in ("calabaza", "chile"))
    frijol = next(e for e in cuerpo["entradas"] if e["cultivo"] == "frijol" and e["ventana"]["estado"] == "EVALUABLE")
    assert "(bea_rf)" in frijol["ventana"]["fuente"]["nombre"] and "no distingue" in frijol["motivo"]
    assert _entrada(cuerpo, "maiz", "PV")["presencia"]["estado"] == "registrado"


def test_isla_suma_siap_e_inifap_encima_de_la_base_mundial(validar):
    cuerpo = cliente.get("/api/calendario", params={"lat": 18.03, "lon": -95.53}).json()
    validar(cuerpo, "calendario-local#")
    assert cuerpo["id"].startswith("calendario-mx-30077-ggcmi-")
    assert cuerpo["ubicacion"]["municipio"] == "Isla" and cuerpo["ubicacion"]["paisIso"] == "MX"
    assert cuerpo["ubicacion"]["claveEstadoInegi"] == "30" and cuerpo["ubicacion"]["claveMunicipioInegi"] == "077"
    # Lo que INIFAP publica para Isla manda sobre GGCMI.
    pv = _entrada(cuerpo, "maiz", "PV")
    assert pv["estado"] == "EVALUABLE"
    assert (pv["ventana"]["desdeMes"], pv["ventana"]["desdeDia"], pv["ventana"]["hastaMes"], pv["ventana"]["hastaDia"]) == (6, 1, 7, 15)
    assert "INIFAP" in pv["ventana"]["fuente"]["nombre"]
    assert _entrada(cuerpo, "maiz", "OI")["ventana"]["estado"] == "EVALUABLE"
    assert "INIFAP" in _entrada(cuerpo, "frijol", "OI")["ventana"]["fuente"]["nombre"]
    # Sin ventana local, la base mundial rellena la ventana y SIAP pone la presencia.
    sorgo = next(e for e in cuerpo["entradas"] if e["cultivo"] == "sorgo" and e["ventana"]["estado"] == "EVALUABLE")
    assert DOI in sorgo["ventana"]["fuente"]["cita"]
    assert sorgo["presencia"]["estado"] in ("registrado", "no_registrado")
    assert "SIAP" in json.dumps(sorgo["presencia"]["fuente"])
    # La calabaza sigue sin calendario en ninguna fuente y SIAP no la registra en Isla.
    calabaza = _entrada(cuerpo, "calabaza", "PV")
    assert calabaza["estado"] == "NO_EVALUABLE" and calabaza["presencia"]["estado"] == "no_registrado"
    assert any(a["codigo"] == "CAPA_LOCAL_ISLA" for a in cuerpo["advertencias"])


def test_mexico_fuera_de_isla_usa_la_base_mundial_y_siap_encima(validar):
    # Texcoco, Estado de Mexico (INEGI 15/099): GGCMI da la ventana, SIAP la presencia de temporal.
    cuerpo = cliente.get("/api/calendario", params={"lat": 19.50, "lon": -98.85}).json()
    validar(cuerpo, "calendario-local#")
    u = cuerpo["ubicacion"]
    assert (u["paisIso"], u["claveEstadoInegi"], u["claveMunicipioInegi"], u["municipio"]) == ("MX", "15", "099", "Texcoco")
    assert cuerpo["id"].startswith("calendario-mx-15099-ggcmi-")
    maiz = next(e for e in cuerpo["entradas"] if e["cultivo"] == "maiz" and e["ventana"]["estado"] == "EVALUABLE")
    assert DOI in maiz["ventana"]["fuente"]["cita"]
    assert maiz["presencia"]["estado"] == "registrado" and "SIAP" in maiz["presencia"]["fuente"]["nombre"]
    registrados = {e["cultivo"] for e in cuerpo["entradas"] if e["presencia"]["estado"] == "registrado"}
    assert {"maiz", "frijol", "cebada", "trigo", "avena", "haba"} <= registrados
    # Un cultivo que SIAP separa pero no registra en el municipio: no_registrado, con periodo.
    yuca = _entrada(cuerpo, "yuca", "PV")
    assert yuca["presencia"]["estado"] == "no_registrado" and yuca["presencia"]["periodo"]["desde"] == "2021-01-01"
    # Sin nombre equivalente en SIAP: la presencia sigue sin_dato.
    assert all(e["presencia"]["estado"] == "sin_dato" for e in cuerpo["entradas"] if e["cultivo"] in ("caupi", "maiz_dulce"))
    assert any(a["codigo"] == "CAPA_SIAP_MUNICIPIO" for a in cuerpo["advertencias"])
    assert "No se usa GGCMI" not in json.dumps(cuerpo)


def test_mexico_urbano_sin_pareja_en_siap_lo_dice(validar):
    cuerpo = cliente.get("/api/calendario", params={"lat": 19.43, "lon": -99.13}).json()
    validar(cuerpo, "calendario-local#")
    assert "municipio" not in cuerpo["ubicacion"]
    assert any(a["codigo"] == "SIAP_SIN_MUNICIPIO" for a in cuerpo["advertencias"])
    assert _entrada(cuerpo, "maiz", "PV")["ventana"]["estado"] == "EVALUABLE"


def test_sin_pais_no_inventa_ubicacion():
    r = cliente.get("/api/calendario", params={"lat": 0, "lon": -40})
    assert r.status_code == 422
