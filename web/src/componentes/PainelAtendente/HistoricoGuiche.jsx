import React from 'react';
import { History, CheckCircle, XCircle } from 'lucide-react';
import './HistoricoGuiche.css';

export function HistoricoGuiche({ historico = [], guiche }) {
  const atendimentos = guiche
    ? historico.filter((item) => item.guiche === guiche)
    : historico;

  return (
    <div className="historico-guiche-secao">
      <div className="historico-guiche-cabecalho">
        <History size={18} />
        <h3 className="historico-guiche-titulo">
          {guiche
            ? `HISTÓRICO DE HOJE (GUICHÊ ${guiche}) — ${atendimentos.length} FINALIZADOS`
            : `HISTÓRICO GERAL DE HOJE — ${atendimentos.length} FINALIZADOS`}
        </h3>
      </div>

      {atendimentos.length === 0 ? (
        <div className="historico-vazio">
          {guiche
            ? 'Nenhum atendimento concluído por este guichê hoje ainda.'
            : 'Nenhum atendimento concluído no sistema hoje ainda.'}
        </div>
      ) : (
        <div className="tabela-container">
          <table className="tabela-atendimentos">
            <thead>
              <tr>
                <th>Senha</th>
                {!guiche && <th>Mesa</th>}
                <th>Serviço</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {atendimentos.slice(0, 5).map((item, index) => {
                const ehConcluido = item.status === 'concluido';

                return (
                  <tr key={item.id || index}>
                    <td className="coluna-senha">{item.codigo_formatado}</td>
                    {!guiche && <td>Guichê {item.guiche || '01'}</td>}
                    <td>{item.tipo_servico}</td>
                    <td>
                      <span className={`status-badge ${ehConcluido ? 'status-ok' : 'status-aus'}`}>
                        {ehConcluido ? <CheckCircle size={14} /> : <XCircle size={14} />}
                        <span>{ehConcluido ? 'Concluído' : 'Ausente'}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
