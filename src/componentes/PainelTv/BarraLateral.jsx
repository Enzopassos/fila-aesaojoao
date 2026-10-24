import React, { useState, useEffect } from 'react';
import { Clock, Calendar } from 'lucide-react';
import './BarraLateral.css';

export function BarraLateral() {
  const [horaAtual, setHoraAtual] = useState('');
  const [dataAtual, setDataAtual] = useState('');

  useEffect(() => {
    function atualizarDataHora() {
      const agora = new Date();

      const horas = String(agora.getHours()).padStart(2, '0');
      const minutos = String(agora.getMinutes()).padStart(2, '0');
      const segundos = String(agora.getSeconds()).padStart(2, '0');
      setHoraAtual(`${horas}:${minutos}:${segundos}`);

      const opcoesData = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      };
      const dataFormatada = agora.toLocaleDateString('pt-BR', opcoesData);
      setDataAtual(dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1));
    }

    atualizarDataHora();
    const intervalo = setInterval(atualizarDataHora, 1000);
    return () => clearInterval(intervalo);
  }, []);

  return (
    <aside className="barra-lateral-container">
      {/* 1. Logo direta sobre o topo claro do degradê (Sem card) */}
      <div className="logo-secao">
        <img
          src="/logo-sao-joao.png"
          alt="Auto Escola São João"
          className="logo-imagem"
        />
      </div>

      {/* 2. Corpo da Barra: Relógio Digital e Data sobre a base escura */}
      <div className="corpo-lateral-secao">
        <div className="relogio-card">
          <div className="relogio-cabecalho">
            <Clock className="icone-relogio" />
            <span className="etiqueta-relogio">HORARIO</span>
          </div>
          <div className="hora-digital">{horaAtual || '--:--:--'}</div>
        </div>

        <div className="data-card">
          <Calendar className="icone-calendario" />
          <span className="data-extenso">{dataAtual}</span>
        </div>
      </div>
    </aside>
  );
}
