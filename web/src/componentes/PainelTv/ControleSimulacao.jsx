import React, { useState } from 'react';
import { Sliders, Volume2, VolumeX, PlusCircle, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import './ControleSimulacao.css';

export function ControleSimulacao({
  onChamarSenha,
  onRechamar,
  audioAtivo,
  onAlternarAudio
}) {
  const [expandido, setExpandido] = useState(false);
  const [guicheSelecionado, setGuicheSelecionado] = useState('02');

  return (
    <div className={`controle-simulacao-container ${expandido ? 'aberto' : 'fechado'}`}>
      <div className="controle-topo" onClick={() => setExpandido(!expandido)}>
        <div className="controle-titulo-bloco">
          <Sliders size={18} />
          <span>SIMULADOR DE ATENDIMENTO</span>
        </div>
        <button className="botao-recolher" aria-label="Expandir controles">
          {expandido ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>

      {expandido && (
        <div className="controle-conteudo">
          {/* Seletor de Guichê */}
          <div className="controle-campo">
            <label className="controle-rotulo">Guichê Simulador:</label>
            <div className="seletor-guiche-botoes">
              {['01', '02', '03', '04'].map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`botao-guiche ${guicheSelecionado === g ? 'selecionado' : ''}`}
                  onClick={() => setGuicheSelecionado(g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Botões de Chamada de Senha */}
          <div className="controle-campo">
            <label className="controle-rotulo">Chamar Próxima Senha:</label>
            <div className="botoes-chamada-grade">
              <button
                type="button"
                className="btn-chamar btn-despachante"
                onClick={() => onChamarSenha('despachante', guicheSelecionado)}
              >
                <PlusCircle size={16} /> Despachante (D)
              </button>

              <button
                type="button"
                className="btn-chamar btn-habilitacao"
                onClick={() => onChamarSenha('habilitacao', guicheSelecionado)}
              >
                <PlusCircle size={16} /> 1ª CNH (H)
              </button>

              <button
                type="button"
                className="btn-chamar btn-exames"
                onClick={() => onChamarSenha('exames', guicheSelecionado)}
              >
                <PlusCircle size={16} /> Exames (E)
              </button>

              <button
                type="button"
                className="btn-chamar btn-preferencial"
                onClick={() => onChamarSenha('preferencial', guicheSelecionado)}
              >
                <PlusCircle size={16} /> Prioritário (P)
              </button>
            </div>
          </div>

          {/* Ações Especiais */}
          <div className="controle-acoes-linha">
            <button
              type="button"
              className="btn-acao btn-rechamar"
              onClick={onRechamar}
            >
              <RotateCcw size={16} /> Rechamar Atual
            </button>

            <button
              type="button"
              className={`btn-acao ${audioAtivo ? 'btn-audio-ligado' : 'btn-audio-desligado'}`}
              onClick={onAlternarAudio}
            >
              {audioAtivo ? <Volume2 size={16} /> : <VolumeX size={16} />}
              {audioAtivo ? 'Som Ligado' : 'Som Mudo'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
