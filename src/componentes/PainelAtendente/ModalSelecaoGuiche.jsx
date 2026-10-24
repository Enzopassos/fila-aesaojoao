import React from 'react';
import { Monitor, Check, X, ShieldCheck } from 'lucide-react';
import './ModalSelecaoGuiche.css';

export function ModalSelecaoGuiche({
  guicheAtual,
  onSelecionar,
  podeFechar,
  onFechar,
  guichesDisponiveis = []
}) {
  return (
    <div className="modal-selecao-overlay">
      <div className="modal-selecao-card">
        {podeFechar && (
          <button
            type="button"
            className="btn-fechar-modal-guiche"
            onClick={onFechar}
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        )}

        <div className="modal-selecao-cabecalho">
          <div className="icone-escudo-box">
            <Monitor size={28} />
          </div>
          <h2 className="modal-selecao-titulo">Em qual guichê você vai atender hoje?</h2>
          <p className="modal-selecao-desc">
            Selecione o seu posto de trabalho para fixar a mesa nesta sessão. Isso evita chamadas acidentais na mesa de outros colegas.
          </p>
        </div>

        <div className="grade-guiches-selecao">
          {guichesDisponiveis.map((item) => {
            const numeroGuiche = String(item.numero).padStart(2, '0');
            const ehSelecionado = String(guicheAtual).padStart(2, '0') === numeroGuiche;

            return (
              <div
                key={item.id}
                className={`card-opcao-guiche ${ehSelecionado ? 'guiche-selecionado' : ''}`}
                onClick={() => onSelecionar(numeroGuiche, item)}
              >
                <div className="card-guiche-topo">
                  <div className="pill-numero-guiche">
                    GUICHÊ {numeroGuiche}
                  </div>
                  {ehSelecionado && (
                    <span className="badge-atual">
                      <Check size={14} /> Ativo Agora
                    </span>
                  )}
                </div>

                <div className="card-guiche-corpo">
                  <h3 className="guiche-nome-opcao">{item.nome}</h3>
                  <p className="guiche-desc-opcao">{item.descricao || 'Atendimento Geral'}</p>
                </div>

                <button
                  type="button"
                  className={`btn-escolher-guiche ${ehSelecionado ? 'btn-ativo' : ''}`}
                >
                  {ehSelecionado ? 'Permanecer neste Guichê' : 'Operar este Guichê'}
                </button>
              </div>
            );
          })}

          {guichesDisponiveis.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#64748b' }}>
              Nenhum guichê ativo encontrado no banco de dados. Cadastre postos no menu "Guichês".
            </div>
          )}
        </div>

        <div className="modal-selecao-rodape">
          <ShieldCheck size={16} />
          <span>Você poderá alterar seu guichê a qualquer momento clicando em "Trocar Mesa".</span>
        </div>
      </div>
    </div>
  );
}
