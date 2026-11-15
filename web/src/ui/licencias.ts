import { tt } from './i18n/actual';

export const condicionesFuentes = [
  { id: 'power', nombre: 'NASA POWER', get texto() { return tt('licencia.power'); }, url: 'https://power.larc.nasa.gov/docs/referencing/' },
  { id: 'openmeteo', nombre: 'Open-Meteo', get texto() { return tt('licencia.openmeteo'); }, url: 'https://open-meteo.com/en/licence' },
  { id: 'soilgrids', nombre: 'ISRIC SoilGrids', get texto() { return tt('licencia.soilgrids'); }, url: 'https://www.isric.org/explore/soilgrids' },
  { id: 'openlandmap', nombre: 'OpenLandMap', get texto() { return tt('licencia.openlandmap'); }, url: 'https://zenodo.org/records/15528401' },
  { id: 'terreno', nombre: 'Terrain Tiles / Tilezen', get texto() { return tt('licencia.terreno'); }, url: 'https://github.com/tilezen/joerd/blob/master/docs/attribution.md' },
  { id: 'fao56', nombre: 'FAO 56', get texto() { return tt('licencia.fao56'); }, url: 'https://www.fao.org/contact-us/terms/en/' },
  { id: 'ecocrop', nombre: 'FAO EcoCrop / Recocrop', get texto() { return tt('licencia.ecocrop'); }, url: 'https://github.com/cropmodels/Recocrop' },
  { id: 'esri', nombre: 'Esri World Imagery', get texto() { return tt('licencia.esri'); }, url: 'https://goto.arcgisonline.com/maps/World_Imagery' },
  { id: 'osm', nombre: 'OpenStreetMap', get texto() { return tt('licencia.osm'); }, url: 'https://www.openstreetmap.org/copyright' },
];
