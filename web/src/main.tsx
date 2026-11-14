import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './ui/tokens.css';
import './ui/styles.css';
import './ui/system.css';

const root = document.getElementById('root');
if (!root) throw new Error('No se encontró el contenedor de AgroHive.');

createRoot(root).render(<StrictMode><App /></StrictMode>);
