import React from 'react';
import { Users, ChevronRight, Sparkles } from 'lucide-react';
import './CardsFilasEspera.css';

export function CardsFilasEspera({
  categorias = [],
  filasEspera = {},
  onChamarPorCategoria
}) {
  const totalGeral = Object.values(filasEspera).reduce(
    (acc, lista) => acc + (Array.isArray(lista) ? lista.length : 0),
    0
  );

  return (
    <div className="filas-espera-painel">
      <div className="filas-painel-header">
        <div className="filas-header-titulos">
          <div className="filas-icone-linha">
            <Users size={20} className="icone-fila-header" />
            <h2 className="filas-painel-titulo">FILAS DE ESPERA</h2>
          </div>
          <span className="filas-contador-total-badge">
            {totalGeral} {totalGeral === 1 ? 'cliente aguardando' : 'clientes aguardando'}
          </span>
        </div>
      </div>

      <div className="filas-lista-vertical">
        {categorias.map((cat) => {
          const lista = filasEspera[cat.id] || [];
          const qtd = lista.length;
          const ehPrioritario = cat.prioridade;

          return (
            <div
              key={cat.id}
              className={`fila-item-card ${ehPrioritario ? 'item-prioritario' : ''}`}
            >
              <div className="fila-item-esquerda">
                <div className="fila-item-info">
                  <div className="fila-item-nome-linha">
                    <span className="fila-item-nome">{cat.nome}</span>
                    {ehPrioritario && (
                      <span className="tag-prioridade-mini">
                        <Sparkles size={12} /> LEGAL
                      </span>
                    )}
                  </div>
                  <span className="fila-item-prefixo">Prefixo: <strong>{cat.prefixo}</strong></span>
                </div>
              </div>

              <div className="fila-item-direita">
                <div className="fila-item-numero-bloco">
                  <span className="numero-espera">{qtd}</span>
                  <span className="rotulo-espera">{qtd === 1 ? 'na fila' : 'na fila'}</span>
                </div>

                <button
                  type="button"
                  className="btn-chamar-item"
                  disabled={qtd === 0}
                  onClick={() => onChamarPorCategoria(cat.id)}
                >
                  <span>Chamar</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          );
        })}

        {categorias.length === 0 && (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.9rem' }}>
            Nenhuma categoria de fila ativa no momento.
          </div>
        )}
      </div>
    </div>
  );
}
