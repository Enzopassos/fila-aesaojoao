import React, { useState, useEffect } from 'react';
import { Volume2, Play, CheckCircle2, UserX, Clock, MapPin, Eye } from 'lucide-react';
import './CardAtendimentoAtual.css';

export function CardAtendimentoAtual({
  senhaAtual,
  guiche,
  ehAdmin = false,
  onAbrirSelecaoGuiche,
  onRechamar,
  onIniciar,
  onFinalizar,
  onMarcarAusente
}) {
  const [segundosDecorridos, setSegundosDecorridos] = useState(0);

  useEffect(() => {
    if (!senhaAtual) {
      setSegundosDecorridos(0);
      return;
    }

    const tempoInicio = new Date(senhaAtual.iniciado_em || senhaAtual.chamado_em).getTime();
    const agora = Date.now();
    setSegundosDecorridos(Math.max(0, Math.floor((agora - tempoInicio) / 1000)));

    const intervalo = setInterval(() => {
      setSegundosDecorridos((s) => s + 1);
    }, 1000);

    return () => clearInterval(intervalo);
  }, [senhaAtual]);

  function formatarTempo(segundos) {
    const min = String(Math.floor(segundos / 60)).padStart(2, '0');
    const seg = String(segundos % 60).padStart(2, '0');
    return `${min}:${seg}`;
  }

  // Se nenhum guichê foi selecionado nesta sessão
  if (!guiche) {
    return (
      <div className="card-atendimento-vazio">
        <div className="vazio-conteudo">
          <div className="icone-guiche-circulo" style={{ background: '#e0f2fe', color: '#0284c7' }}>
            <Eye size={36} />
          </div>
          <h2 className="vazio-titulo">Modo de Acompanhamento</h2>
          <p className="vazio-subtitulo">
            {ehAdmin
              ? 'Você está visualizando as filas e chamadas em tempo real sem ocupar nenhum guichê.'
              : 'Nenhum guichê foi definido para esta sessão.'}
          </p>
          <button
            type="button"
            className="btn-definir-guiche-card"
            onClick={onAbrirSelecaoGuiche}
            style={{
              marginTop: '1.2rem',
              padding: '0.65rem 1.25rem',
              backgroundColor: '#1e3a8a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.9rem',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <MapPin size={16} />
            <span>Definir Guichê para Atender</span>
          </button>
        </div>
      </div>
    );
  }

  // Se não houver ninguém em atendimento neste guichê
  if (!senhaAtual) {
    return (
      <div className="card-atendimento-vazio">
        <div className="vazio-conteudo">
          <div className="icone-guiche-circulo">
            <MapPin size={36} />
          </div>
          <h2 className="vazio-titulo">Guichê {guiche} Disponível</h2>
          <p className="vazio-subtitulo">
            Aguardando chamada. Selecione uma das filas ao lado para chamar o próximo cliente.
          </p>
        </div>
      </div>
    );
  }

  const emAtendimento = senhaAtual.status === 'em_atendimento';

  return (
    <div className="card-atendimento-container">
      {/* Topo do Card */}
      <div className="atendimento-cabecalho">
        <div className="categoria-pill">
          <span>{senhaAtual.tipo_servico}</span>
        </div>

        <div className={`status-atendimento-pill ${emAtendimento ? 'status-em-atendimento' : 'status-chamando'}`}>
          <span className="ponto-status"></span>
          <span>{emAtendimento ? 'EM ATENDIMENTO' : 'CHAMADO NA TV'}</span>
        </div>
      </div>

      {/* Miolo: Número da Senha e Cronômetro */}
      <div className="atendimento-corpo">
        <div className="senha-bloco">
          <span className="rotulo-mini">SENHA ATUAL</span>
          <div className="senha-codigo">{senhaAtual.codigo_formatado}</div>
          <span className="guiche-indicador">Local: Guichê {guiche}</span>
        </div>

        <div className="cronometro-bloco">
          <div className="cronometro-topo">
            <Clock size={16} />
            <span>{emAtendimento ? 'TEMPO DE ATENDIMENTO' : 'AGUARDANDO CHEGADA'}</span>
          </div>
          <div className="tempo-display">{formatarTempo(segundosDecorridos)}</div>
        </div>
      </div>

      {/* Botões de Ação da Atendente */}
      <div className="atendimento-acoes-grade">
        <button
          type="button"
          className="btn-acao btn-rechamar"
          onClick={onRechamar}
          title="Toca o sino e fala a senha na TV novamente"
        >
          <Volume2 size={18} />
          <span>Rechamar na TV</span>
        </button>

        {!emAtendimento ? (
          <button
            type="button"
            className="btn-acao btn-iniciar"
            onClick={onIniciar}
          >
            <Play size={18} />
            <span>Iniciar Atendimento</span>
          </button>
        ) : (
          <button
            type="button"
            className="btn-acao btn-finalizar"
            onClick={onFinalizar}
          >
            <CheckCircle2 size={18} />
            <span>Concluir Atendimento</span>
          </button>
        )}

        <button
          type="button"
          className="btn-acao btn-ausente"
          onClick={onMarcarAusente}
        >
          <UserX size={18} />
          <span>Marcar Ausente</span>
        </button>
      </div>
    </div>
  );
}
