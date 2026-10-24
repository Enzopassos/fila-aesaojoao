import React from 'react';
import { ArrowRight } from 'lucide-react';
import './HistoricoSenhas.css';

export function HistoricoSenhas({ chamadasAnteriores }) {
  if (!chamadasAnteriores || chamadasAnteriores.length === 0) return null;

  return (
    <div className="historico-container">
      <div className="historico-cabecalho">
        <h2 className="historico-titulo">ÚLTIMAS CHAMADAS</h2>
      </div>

      <div className="historico-grade">
        {chamadasAnteriores.map((item) => (
          <div key={item.id} className="historico-card">
            <div className="historico-topo">
              <span className="historico-categoria">{item.tipo_servico}</span>
            </div>

            <div className="historico-senha">{item.codigo_formatado}</div>

            <div className="historico-guiche-linha">
              <span>GUICHÊ {item.guiche}</span>
              <ArrowRight className="icone-seta" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
