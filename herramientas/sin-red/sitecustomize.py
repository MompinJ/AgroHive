"""Simula una maquina SIN internet para el proceso de la API (A5.8): solo deja salir conexiones a este equipo.

Python carga este archivo solo al arrancar si su carpeta esta en PYTHONPATH (lo hace herramientas/demo-sin-red.sh). No toca la red
del sistema ni apaga el wifi: bloquea la resolucion de nombres y la conexion a cualquier direccion que no sea loopback. Lo que
no pasa por los sockets de Python (por ejemplo GDAL/libcurl en rasterio) se bloquea con proxies invalidos desde el script.
"""
import ipaddress
import socket

_LOCALES = {"localhost", "127.0.0.1", "::1", "0.0.0.0", ""}
_getaddrinfo = socket.getaddrinfo
_connect = socket.socket.connect


def _es_local(direccion) -> bool:
    try:
        return ipaddress.ip_address(str(direccion)).is_loopback
    except ValueError:
        return str(direccion) in _LOCALES


def _getaddrinfo_sin_red(host, *args, **kwargs):
    if host is not None and not _es_local(host) and str(host) not in _LOCALES:
        raise socket.gaierror(socket.EAI_NONAME, f"sin red (A5.8): no se resuelve {host}")
    return _getaddrinfo(host, *args, **kwargs)


def _connect_sin_red(self, direccion):
    if isinstance(direccion, tuple) and direccion and not _es_local(direccion[0]):
        raise OSError(101, f"sin red (A5.8): conexion bloqueada a {direccion[0]}")
    return _connect(self, direccion)


socket.getaddrinfo = _getaddrinfo_sin_red
socket.socket.connect = _connect_sin_red
