import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CardAtendimentoAtual } from './CardAtendimentoAtual';
import { CardsFilasEspera } from './CardsFilasEspera';
import { HistoricoGuiche } from './HistoricoGuiche';
import { ModalSelecaoGuiche } from './ModalSelecaoGuiche';
import { guicheServico } from '../../servicos/guicheServico';
import { categoriaServico } from '../../servicos/categoriaServico';
import { filaServico } from '../../servicos/filaServico';
import { inscreverEventos } from '../../servicos/canalSincronizacao';
import { useAutenticacao } from '../../contextos/AutenticacaoContexto';
import { Monitor, RefreshCw, Headphones } from 'lucide-react';
import { CabecalhoPagina } from '../CabecalhoPagina';
import './PainelAtendente.css';

export function PainelAtendente() {
  const { usuario } = useAutenticacao();

  const [guiche, setGuiche] = useState(() => {
    return localStorage.getItem('guiche_operador') || null;
  });

  const [modalAberto, setModalAberto] = useState(() => {
    return !localStorage.getItem('guiche_operador');
  });

  const [guichesDisponiveis, setGuichesDisponiveis] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [senhasAguardando, setSenhasAguardando] = useState([]);
  const [atendimentosAtivos, setAtendimentosAtivos] = useState({});
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Carrega guichês e categorias do banco de dados
  const carregarMetadados = useCallback(async () => {
    try {
      const [dadosGuiches, dadosCategorias] = await Promise.all([
        guicheServico.listarGuiches(true),
        categoriaServico.listarCategorias(true)
      ]);
      setGuichesDisponiveis(dadosGuiches);
      setCategorias(dadosCategorias);
    } catch (err) {
      console.error('[PainelAtendente] Falha ao carregar metadados:', err);
    }
  }, []);

  // Carrega estado operacional das filas e senhas do dia
  const carregarEstadoFila = useCallback(async () => {
    try {
      const [aguardando, ativos, hist] = await Promise.all([
        filaServico.listarSenhasAguardando(),
        filaServico.obterAtendimentosAtivosPorGuiche(),
        filaServico.obterHistoricoHoje()
      ]);
      setSenhasAguardando(aguardando);
      setAtendimentosAtivos(ativos);
      setHistorico(hist);
    } catch (err) {
      console.error('[PainelAtendente] Erro ao sincronizar estado da fila:', err);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarMetadados();
    carregarEstadoFila();

    // 1. Inscrição em tempo real no Supabase Realtime
    const cancelarRealtime = filaServico.inscreverMudancasFila(() => {
      carregarEstadoFila();
    });

    // 2. Inscrição complementar via BroadcastChannel
    const cancelarBroadcast = inscreverEventos(() => {
      carregarEstadoFila();
    });

    return () => {
      cancelarRealtime();
      cancelarBroadcast();
    };
  }, [carregarMetadados, carregarEstadoFila]);

  // Agrupa senhas aguardando por ID de categoria
  const filasEsperaPorCategoria = useMemo(() => {
    const mapa = {};
    categorias.forEach((cat) => {
      mapa[cat.id] = [];
    });

    senhasAguardando.forEach((s) => {
      if (!mapa[s.categoria_id]) {
        mapa[s.categoria_id] = [];
      }
      mapa[s.categoria_id].push(s);
    });

    return mapa;
  }, [categorias, senhasAguardando]);

  // Localiza objeto do guichê atual para obter seu UUID no banco
  const guicheObjAtual = useMemo(() => {
    if (!guiche) return null;
    return guichesDisponiveis.find(
      (g) => String(g.numero).padStart(2, '0') === String(guiche).padStart(2, '0')
    ) || null;
  }, [guiche, guichesDisponiveis]);

  function handleSelecionarGuiche(novoNumeroGuiche) {
    const num = String(novoNumeroGuiche).padStart(2, '0');
    setGuiche(num);
    localStorage.setItem('guiche_operador', num);
    setModalAberto(false);
  }

  async function handleChamarPorCategoria(categoriaId) {
    if (!guiche) {
      setModalAberto(true);
      return;
    }

    try {
      await filaServico.chamarProximoNumero({
        guicheId: guicheObjAtual?.id || null,
        guicheNumero: guiche,
        atendenteId: usuario?.id || null,
        categoriaId
      });
      await carregarEstadoFila();
    } catch (err) {
      alert(err?.message || 'Erro ao chamar senha da categoria.');
    }
  }

  async function handleRechamar() {
    const guicheFormatado = String(guiche || '01').padStart(2, '0');
    const senhaAtual = atendimentosAtivos[guicheFormatado];
    if (senhaAtual) {
      try {
        await filaServico.rechamarSenha(senhaAtual.id, guicheFormatado);
        await carregarEstadoFila();
      } catch (err) {
        alert(err?.message || 'Erro ao rechamar senha.');
      }
    }
  }

  async function handleIniciar() {
    const guicheFormatado = String(guiche || '01').padStart(2, '0');
    const senhaAtual = atendimentosAtivos[guicheFormatado];
    if (senhaAtual) {
      try {
        await filaServico.iniciarAtendimento(senhaAtual.id);
        await carregarEstadoFila();
      } catch (err) {
        alert(err?.message || 'Erro ao iniciar atendimento.');
      }
    }
  }

  async function handleFinalizar() {
    const guicheFormatado = String(guiche || '01').padStart(2, '0');
    const senhaAtual = atendimentosAtivos[guicheFormatado];
    if (senhaAtual) {
      try {
        await filaServico.finalizarAtendimento(senhaAtual.id);
        await carregarEstadoFila();
      } catch (err) {
        alert(err?.message || 'Erro ao finalizar atendimento.');
      }
    }
  }

  async function handleMarcarAusente() {
    const guicheFormatado = String(guiche || '01').padStart(2, '0');
    const senhaAtual = atendimentosAtivos[guicheFormatado];
    if (senhaAtual) {
      try {
        await filaServico.marcarAusente(senhaAtual.id);
        await carregarEstadoFila();
      } catch (err) {
        alert(err?.message || 'Erro ao marcar ausente.');
      }
    }
  }

  const guicheEfetivo = guiche ? String(guiche).padStart(2, '0') : '01';
  const senhaDoGuiche = atendimentosAtivos[guicheEfetivo] || null;
  const temAtendimentoAtivo = Boolean(
    senhaDoGuiche && (senhaDoGuiche.status === 'chamado' || senhaDoGuiche.status === 'em_atendimento')
  );

  return (
    <div className="painel-atendente-container">
      <CabecalhoPagina
        icone={Headphones}
        titulo="Painel de Atendimento"
        subtitulo="Gerenciamento de chamadas e fluxo da recepção integrado ao banco em tempo real."
        acoes={
          <div className="posto-atendimento-fixo">
            <div className="icone-monitor-box">
              <Monitor size={20} />
            </div>

            <div className="posto-info-bloco">
              <span className="posto-rotulo">POSTO DE TRABALHO</span>
              <span className="posto-nome">
                {guiche ? `GUICHÊ ${guiche}` : 'NENHUM DEFINIDO'}
              </span>
            </div>

            <button
              type="button"
              className="btn-trocar-mesa"
              onClick={() => setModalAberto(true)}
              disabled={temAtendimentoAtivo}
              title={
                temAtendimentoAtivo
                  ? 'Conclua ou cancele o atendimento em andamento para poder trocar de guichê'
                  : 'Alterar o guichê em que você está operando'
              }
            >
              <RefreshCw size={14} />
              <span>Trocar de Guichê</span>
            </button>
          </div>
        }
      />

      {/* Grid Lado a Lado: Operação à Esquerda e Filas de Espera à Direita */}
      <main className="atendente-grid-lado-a-lado">
        <div className="coluna-operacao-esquerda">
          <CardAtendimentoAtual
            senhaAtual={senhaDoGuiche}
            guiche={guicheEfetivo}
            onRechamar={handleRechamar}
            onIniciar={handleIniciar}
            onFinalizar={handleFinalizar}
            onMarcarAusente={handleMarcarAusente}
          />

          <HistoricoGuiche historico={historico} guiche={guicheEfetivo} />
        </div>

        <div className="coluna-filas-direita">
          <CardsFilasEspera
            categorias={categorias}
            filasEspera={filasEsperaPorCategoria}
            onChamarPorCategoria={handleChamarPorCategoria}
          />
        </div>
      </main>

      {/* Modal de Seleção de Guichê Dinâmico */}
      {modalAberto && (
        <ModalSelecaoGuiche
          guicheAtual={guiche}
          onSelecionar={handleSelecionarGuiche}
          podeFechar={!!guiche}
          onFechar={() => setModalAberto(false)}
          guichesDisponiveis={guichesDisponiveis}
        />
      )}
    </div>
  );
}
