import React from 'react';
import { History, CheckCircle, XCircle } from 'lucide-react';
import './HistoricoGuiche.css';

export function HistoricoGuiche({ historico, guiche }) {
  const atendimentosDoGuiche = historico.filter((item) => item.guiche === guiche);

  return (
    <div className="historico-guiche-secao">
      <div className="historico-guiche-cabecalho">
        <History size={18} />
        <h3 className="historico-guiche-titulo">
          HISTÓRICO DE HOJE (GUICHÊ {guiche}) — {atendimentosDoGuiche.length} FINALIZADOS
        </h3>
      </div>

      {atendimentosDoGuiche.length === 0 ? (
        <div className="historico-vazio">
          Nenhum atendimento concluído por este guichê hoje ainda.
        </div>
      ) : (
        <div className="tabela-container">
          <table className="tabela-atendimentos">
            <thead>
              <tr>
                <th>Senha</th>
                <th>Serviço</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {atendimentosDoGuiche.slice(0, 5).map((item, index) => {
                const ehConcluido = item.status === 'concluido';

                return (
                  <tr key={item.id || index}>
                    <td className="coluna-senha">{item.codigo_formatado}</td>
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
