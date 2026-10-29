import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LimiteDeErro } from './componentes/Comum/LimiteDeErro';
import './estilos/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LimiteDeErro>
      <App />
    </LimiteDeErro>
  </React.StrictMode>
);
