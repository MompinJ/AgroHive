import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { TutorialEsquilote } from './ui/tutorial/Tutorial';
import { BotonSonido } from './ui/BotonSonido';
import { instalarClicGlobal } from './ui/sonido';
import { ProveedorIdioma } from './ui/i18n/Idioma';
import './ui/tokens.css';
import './ui/styles.css';
import './ui/system.css';
import './ui/laboratorio.css';

const root = document.getElementById('root');
if (!root) throw new Error('No se encontró el contenedor de AgroHive.');

instalarClicGlobal();
createRoot(root).render(<StrictMode><ProveedorIdioma><App /><TutorialEsquilote /><BotonSonido /></ProveedorIdioma></StrictMode>);
