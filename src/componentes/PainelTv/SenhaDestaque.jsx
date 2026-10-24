import React from 'react';
import { MapPin, Volume2 } from 'lucide-react';
import './SenhaDestaque.css';

export function SenhaDestaque({ senhaAtual, emAnimacao }) {
  if (!senhaAtual) {
    return (
      <div className="senha-destaque-container estado-vazio">
        <div className="destaque-cabecalho cabecalho-centralizado">
          <div className="tipo-servico-badge">
            <span className="badge-categoria">AUTO ESCOLA & DESPACHANTE SÃO JOÃO</span>
          </div>
        </div>

        <div className="numero-senha-wrapper">
          <span className="rotulo-senha">STATUS DO SISTEMA</span>
          <div className="numero-senha-principal estado-aguardando">
            PRONTO
          </div>
        </div>

        <div className="destaque-guiche-wrapper">
          <div className="guiche-card guiche-card-aguardando">
            <MapPin className="icone-guiche icone-guiche-aguardando" />
            <span className="guiche-texto guiche-texto-aguardando">AGUARDANDO CHAMADAS</span>
          </div>
        </div>
      </div>
    );
  }

  const ehPrioritario = senhaAtual.preferencial;

  return (
    <div className={`senha-destaque-container ${emAnimacao ? 'chamando' : ''}`}>
      {/* Topo: Categoria e Alerta */}
      <div className="destaque-cabecalho">
        <div className="tipo-servico-badge">
          <span className="badge-categoria">
            {ehPrioritario ? 'ATENDIMENTO PRIORITÁRIO' : senhaAtual.tipo_servico}
          </span>
        </div>

        {emAnimacao && (
          <div className="alerta-chamando-tag">
            <Volume2 className="icone-alerta-chamando" />
            <span>CHAMANDO</span>
          </div>
        )}
      </div>

      {/* Número da Senha em Destaque Gigante Proporcional */}
      <div className="numero-senha-wrapper">
        <span className="rotulo-senha">SENHA</span>
        <div className="numero-senha-principal">
          {senhaAtual.codigo_formatado}
        </div>
      </div>

      {/* Caixa do Guichê / Mesa */}
      <div className="destaque-guiche-wrapper">
        <div className="guiche-card">
          <MapPin className="icone-guiche" />
          <span className="guiche-texto">GUICHÊ {senhaAtual.guiche}</span>
        </div>
      </div>
    </div>
  );
}
