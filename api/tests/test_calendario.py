"""A4.13: Isla sigue con SIAP/INIFAP; fuera de Mexico el maiz sale de GGCMI y el frijol no se inventa."""
from fastapi.testclient import TestClient

from app.main import app

cliente = TestClient(app)


def _maiz(cuerpo, temporada):
    return next(e for e in cuerpo["entradas"] if e["cultivo"] == "maiz" and e["temporada"] == temporada)


def test_isla_sigue_con_siap_e_inifap(validar):
    cuerpo = cliente.get("/api/calendario", params={"lat": 18.03, "lon": -95.53}).json()
    validar(cuerpo, "calendario-local#")
    assert cuerpo["id"] == "calendario-isla"
    pv = _maiz(cuerpo, "PV")
    assert pv["estado"] == "EVALUABLE"
    assert pv["ventana"]["desdeMes"] == 6 and pv["ventana"]["desdeDia"] == 1
    assert pv["ventana"]["hastaMes"] == 7 and pv["ventana"]["hastaDia"] == 15
    assert "INIFAP" in pv["ventana"]["fuente"]["nombre"]
    assert "10.5281/zenodo.5062513" not in json_citas(cuerpo)


def test_iowa_devuelve_el_dia_de_siembra_de_ggcmi_y_no_inventa_frijol(validar):
    cuerpo = cliente.get("/api/calendario", params={"lat": 42.0, "lon": -93.5}).json()
    validar(cuerpo, "calendario-local#")
    assert cuerpo["ubicacion"]["paisIso"] == "US"
    pv = _maiz(cuerpo, "PV")
    assert pv["estado"] == "EXPLORATORIO"
    assert pv["ventana"]["desdeMes"] == 5 and pv["ventana"]["desdeDia"] == 13
    assert pv["ventana"]["hastaMes"] == 5 and pv["ventana"]["hastaDia"] == 13
    assert "10.5281/zenodo.5062513" in pv["ventana"]["fuente"]["cita"]
    assert "Madurez" in pv["ventana"]["fuente"]["nota"]
    assert pv["presencia"]["estado"] == "sin_dato"
    oi = _maiz(cuerpo, "OI")
    assert oi["estado"] == "NO_EVALUABLE" and oi["ventana"]["estado"] == "NO_EVALUABLE"
    frijol = [e for e in cuerpo["entradas"] if e["cultivo"] == "frijol"]
    assert frijol and all(e["estado"] == "NO_EVALUABLE" and "bea" in e["motivo"] for e in frijol)
    for cultivo in ("calabaza", "chile"):
        assert all(e["estado"] == "NO_EVALUABLE" for e in cuerpo["entradas"] if e["cultivo"] == cultivo)


def test_mexico_fuera_de_isla_no_usa_ggcmi(validar):
    cuerpo = cliente.get("/api/calendario", params={"lat": 19.43, "lon": -99.13}).json()
    validar(cuerpo, "calendario-local#")
    assert cuerpo["ubicacion"]["paisIso"] == "MX"
    assert cuerpo["id"] != "calendario-isla"
    assert all(e["estado"] == "NO_EVALUABLE" for e in cuerpo["entradas"])
    assert "10.5281/zenodo.5062513" not in json_citas(cuerpo)
    assert "Isla" in cuerpo["entradas"][0]["motivo"]


def test_sin_pais_no_inventa_ubicacion():
    r = cliente.get("/api/calendario", params={"lat": 0, "lon": -40})
    assert r.status_code == 422


def json_citas(cuerpo) -> str:
    import json
    return json.dumps(cuerpo)
