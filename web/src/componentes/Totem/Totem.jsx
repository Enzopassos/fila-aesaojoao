import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, RefreshCw, CheckCircle2, AlertCircle, ArrowRight, Star, Layers } from 'lucide-react';
import { categoriaServico } from '../../servicos/categoriaServico';
import { filaServico } from '../../servicos/filaServico';
import './Totem.css';

/**
 * Componente Totem de Autoatendimento
 * Permite a emissão ágil de senhas por categoria na web para validação da esteira em tempo real.
 */
export function Totem() {
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [emitindoId, setEmitindoId] = useState(null);
  const [notificacao, setNotificacao] = useState(null);
  const timerNotificacao = useRef(null);

  const carregarCategorias = useCallback(async () => {
    setCarregando(true);
    try {
      const dados = await categoriaServico.listarCategorias(true);
      setCategorias(dados || []);
    } catch (erro) {
      console.error('[Totem] Erro ao carregar categorias:', erro);
      exibirNotificacao('erro', 'Não foi possível carregar as categorias de atendimento.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarCategorias();

    return () => {
      if (timerNotificacao.current) {
        clearTimeout(timerNotificacao.current);
      }
    };
  }, [carregarCategorias]);

  const exibirNotificacao = (tipo, mensagem) => {
    if (timerNotificacao.current) {
      clearTimeout(timerNotificacao.current);
    }

    setNotificacao({ tipo, mensagem });

    timerNotificacao.current = setTimeout(() => {
      setNotificacao(null);
    }, 3500);
  };

  const handleEmitirSenha = async (categoria) => {
    if (!categoria || emitindoId) return;

    setEmitindoId(categoria.id);

    try {
      await filaServico.gerarNovaSenha(categoria);
      exibirNotificacao(
        'sucesso',
        `Senha para "${categoria.nome}" emitida com sucesso! Acompanhe pelo painel.`
      );
    } catch (erro) {
      console.error('[Totem] Falha ao emitir senha:', erro);
      exibirNotificacao(
        'erro',
        erro?.message || 'Falha ao solicitar senha. Tente novamente.'
      );
    } finally {
      setEmitindoId(null);
    }
  };

  return (
    <div className="totem-conteiner">
      {/* Alerta / Notificação Flutuante de Confirmação */}
      {notificacao && (
        <div className={`totem-notificacao ${notificacao.tipo}`} role="alert">
          {notificacao.tipo === 'sucesso' ? (
            <CheckCircle2 size={24} />
          ) : (
            <AlertCircle size={24} />
          )}
          <span>{notificacao.mensagem}</span>
        </div>
      )}

      {/* Barra Superior do Totem */}
      <header className="totem-cabecalho">
        <div className="totem-cabecalho-info">
          <h1>
            <Layers size={28} />
            <span>Autoatendimento</span>
          </h1>
          <p>Selecione o serviço desejado para entrar na fila</p>
        </div>

        <div className="totem-cabecalho-acoes">
          <button
            type="button"
            className="totem-botao-icone"
            onClick={carregarCategorias}
            title="Recarregar categorias"
            aria-label="Recarregar categorias"
          >
            <RefreshCw size={20} className={carregando ? 'totem-spinner' : ''} />
          </button>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="totem-principal">
        <div className="totem-instrucao">
          <h2>Como podemos ajudar você hoje?</h2>
          <p>Toque na opção desejada para solicitar seu atendimento</p>
        </div>

        {carregando ? (
          <div className="totem-estado-central">
            <RefreshCw size={40} className="totem-spinner" />
            <p>Carregando serviços disponíveis...</p>
          </div>
        ) : categorias.length === 0 ? (
          <div className="totem-estado-central">
            <AlertCircle size={40} />
            <p>Nenhuma categoria de atendimento ativa no momento.</p>
          </div>
        ) : (
          <div className="totem-grade-categorias">
            {categorias.map((cat) => {
              const estaEmitindo = emitindoId === cat.id;
              const corFundoBadge = cat.cor_fundo || '#dbeafe';
              const corTextoBadge = cat.cor_badge || '#2563eb';

              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`totem-cartao-categoria ${cat.prioridade ? 'preferencial' : ''}`}
                  onClick={() => handleEmitirSenha(cat)}
                  disabled={Boolean(emitindoId)}
                >
                  <div className="totem-cartao-cabecalho">
                    <span
                      className="totem-badge-prefixo"
                      style={{
                        backgroundColor: corFundoBadge,
                        color: corTextoBadge
                      }}
                    >
                      {cat.prefixo}
                    </span>

                    {cat.prioridade && (
                      <span className="totem-tag-prioridade">
                        <Star size={14} fill="currentColor" />
                        <span>Prioritário</span>
                      </span>
                    )}
                  </div>

                  <div className="totem-cartao-corpo">
                    <h3 className="totem-cartao-titulo">{cat.nome}</h3>
                    <p className="totem-cartao-descricao">
                      {cat.prioridade
                        ? 'Atendimento preferencial garantido por lei.'
                        : 'Atendimento convencional por ordem de chegada.'}
                    </p>
                  </div>

                  <div className="totem-cartao-rodape">
                    {estaEmitindo ? (
                      <>
                        <RefreshCw size={18} className="totem-spinner" />
                        <span>Gerando...</span>
                      </>
                    ) : (
                      <>
                        <span>Toque para retirar</span>
                        <ArrowRight size={18} className="totem-icone-acao" />
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      {/* Rodapé Informativo */}
      <footer className="totem-rodape">
        <p>Sistema de Gestão de Filas &bull; Autoatendimento Web</p>
      </footer>
    </div>
  );
}
