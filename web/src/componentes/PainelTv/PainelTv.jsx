import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { BarraLateral } from './BarraLateral';
import { SenhaDestaque } from './SenhaDestaque';
import { HistoricoSenhas } from './HistoricoSenhas';
import { LetreiroAvisos } from './LetreiroAvisos';
import { filaServico } from '../../servicos/filaServico';
import {
  anunciarChamada,
  inicializarContextoAudio,
  preCarregarTodosAudios,
  inscreverDiagnosticoAudio,
  obterEstatisticasAudio
} from '../../servicos/audioServico';
import { inscreverEventos } from '../../servicos/canalSincronizacao';
import './PainelTv.css';

const LARGURA_REFERENCIA = 1920;
const ALTURA_REFERENCIA = 1080;

function calcularEscala() {
  const larguraDisponivel = window.innerWidth || document.documentElement.clientWidth || LARGURA_REFERENCIA;
  const alturaDisponivel = window.innerHeight || document.documentElement.clientHeight || ALTURA_REFERENCIA;
  return Math.min(larguraDisponivel / LARGURA_REFERENCIA, alturaDisponivel / ALTURA_REFERENCIA);
}

export function PainelTv() {
  const [escala, setEscala] = useState(calcularEscala);
  const [senhaDestaque, setSenhaDestaque] = useState(null);
  const [ultimasChamadas, setUltimasChamadas] = useState([]);
  const [emAnimacao, setEmAnimacao] = useState(false);
  const [audioDesbloqueado, setAudioDesbloqueado] = useState(false);
  const [logsDiagnostico, setLogsDiagnostico] = useState([]);
  const [exibirDiagnostico, setExibirDiagnostico] = useState(true);
  const [estatisticas, setEstatisticas] = useState({
    estado: 'inativo',
    taxaAmostragem: 0,
    totalEmMemoria: 0,
    totalDisponivel: 38
  });

  const timerAnimacao = useRef(null);
  const ultimaChamadaProcessadaRef = useRef({ chave: '', carimboTempo: 0 });

  // Inscrição no canal de diagnóstico em tempo real e pré-carregamento imediato dos áudios
  useEffect(() => {
    const cancelarDiagnostico = inscreverDiagnosticoAudio((item) => {
      setLogsDiagnostico((anteriores) => [...anteriores.slice(-7), item]);
      setEstatisticas(obterEstatisticasAudio());
    });

    // Pré-carrega todos os 38 clips em background assim que o painel é montado
    preCarregarTodosAudios().then(() => {
      setEstatisticas(obterEstatisticasAudio());
    });

    return () => {
      cancelarDiagnostico();
    };
  }, []);

  // Mantém a proporção exata ao redimensionar a tela da TV
  useEffect(() => {
    function atualizarEscala() {
      setEscala(calcularEscala());
    }

    atualizarEscala();
    window.addEventListener('resize', atualizarEscala);

    if (window.visualViewport && typeof window.visualViewport.addEventListener === 'function') {
      window.visualViewport.addEventListener('resize', atualizarEscala);
    }

    return () => {
      window.removeEventListener('resize', atualizarEscala);
      if (window.visualViewport && typeof window.visualViewport.removeEventListener === 'function') {
        window.visualViewport.removeEventListener('resize', atualizarEscala);
      }
    };
  }, []);

  // Desbloqueia o subsistema de áudio e pré-carrega as vozes
  const desbloquearAudio = useCallback(async () => {
    await inicializarContextoAudio();
    await preCarregarTodosAudios();
    setEstatisticas(obterEstatisticasAudio());
    setAudioDesbloqueado(true);
  }, []);

  // Ouvinte de interação para desbloqueio passivo (controle remoto ou toque)
  useEffect(() => {
    async function lidarInteracao() {
      await desbloquearAudio();
      window.removeEventListener('click', lidarInteracao);
      window.removeEventListener('keydown', lidarInteracao);
    }

    window.addEventListener('click', lidarInteracao, { once: true });
    window.addEventListener('keydown', lidarInteracao, { once: true });

    return () => {
      window.removeEventListener('click', lidarInteracao);
      window.removeEventListener('keydown', lidarInteracao);
    };
  }, [desbloquearAudio]);

  const dispararAlertaVisualESonoro = useCallback((senha) => {
    if (!senha) return;

    if (timerAnimacao.current) {
      clearTimeout(timerAnimacao.current);
    }
    setEmAnimacao(true);

    anunciarChamada(
      senha.codigo_formatado,
      senha.guiche || senha.guiche_numero || '01'
    );

    timerAnimacao.current = setTimeout(() => {
      setEmAnimacao(false);
    }, 4500);
  }, []);

  // Processa a chamada evitando disparos duplicados quando Supabase Realtime e BroadcastChannel emitem juntos
  const processarChamadaComDeduplicacao = useCallback(
    (senha) => {
      if (!senha) return;

      const agora = Date.now();
      const idSenha = senha.id || senha.codigo_formatado || 'padrao';
      const contador = senha.chamadas_total || 0;
      const chaveAtual = `${idSenha}_${contador}`;
      const ultima = ultimaChamadaProcessadaRef.current;

      // Descarta se for exatamente o mesmo evento recebido no intervalo de 2,5 segundos
      if (ultima.chave === chaveAtual && agora - ultima.carimboTempo < 2500) {
        return;
      }

      ultimaChamadaProcessadaRef.current = {
        chave: chaveAtual,
        carimboTempo: agora
      };

      setSenhaDestaque(senha);
      dispararAlertaVisualESonoro(senha);
    },
    [dispararAlertaVisualESonoro]
  );

  // Carrega estado inicial de senhas chamadas diretamente do banco
  const carregarDadosIniciais = useCallback(async () => {
    try {
      const destaque = await filaServico.obterSenhaDestaqueAtual();
      if (destaque) {
        setSenhaDestaque(destaque);
      }
      const ultimas = await filaServico.obterUltimasChamadasCronologicas(destaque?.id || null, 4);
      if (ultimas && ultimas.length > 0) {
        setUltimasChamadas(ultimas);
      }
    } catch (err) {
      console.error('[PainelTv] Erro ao carregar dados do banco:', err);
    }
  }, []);

  useEffect(() => {
    carregarDadosIniciais();

    // 1. Inscrição em tempo real no Supabase Realtime (Multi-dispositivo)
    const cancelarRealtime = filaServico.inscreverMudancasFila(async (payload) => {
      const novaSenha = payload?.new;
      if (!novaSenha) return;

      const guiche = novaSenha.guiche_numero || '01';
      const senhaFormatada = { ...novaSenha, guiche };

      if (novaSenha.status === 'chamado') {
        processarChamadaComDeduplicacao(senhaFormatada);

        const ultimasAtualizadas = await filaServico.obterUltimasChamadasCronologicas(novaSenha.id, 4);
        setUltimasChamadas(ultimasAtualizadas);
      } else if (novaSenha.status === 'em_atendimento') {
        setSenhaDestaque((atual) =>
          atual && atual.id === novaSenha.id ? { ...atual, ...senhaFormatada } : atual
        );
      }
    });

    // 2. Inscrição local via BroadcastChannel (comunicação imediata entre abas do mesmo navegador)
    const cancelarBroadcast = inscreverEventos(async (evento) => {
      if (evento.tipo === 'CHAMAR_SENHA' || evento.tipo === 'RECHAMAR_SENHA') {
        const { senha, senhaDestaque: destaqueLocal } = evento.cargaUtil || {};
        const senhaEfetiva = destaqueLocal || senha;

        if (senhaEfetiva) {
          processarChamadaComDeduplicacao(senhaEfetiva);
        }

        const ultimasAtualizadas = await filaServico.obterUltimasChamadasCronologicas(senhaEfetiva?.id || null, 4);
        setUltimasChamadas(ultimasAtualizadas);
      }
    });

    return () => {
      cancelarRealtime();
      cancelarBroadcast();
      if (timerAnimacao.current) {
        clearTimeout(timerAnimacao.current);
      }
    };
  }, [carregarDadosIniciais, processarChamadaComDeduplicacao]);

  const handleTestarChamada = (e) => {
    if (e) e.stopPropagation();
    anunciarChamada(
      senhaDestaque?.codigo_formatado || 'A001',
      senhaDestaque?.guiche || senhaDestaque?.guiche_numero || '01'
    );
  };

  return (
    <div className="painel-tv-palco-externo">
      {/* Alerta de desbloqueio passivo caso a TV exija interação inicial */}
      {!audioDesbloqueado && (
        <button
          type="button"
          className="painel-tv-alerta-audio"
          onClick={desbloquearAudio}
        >
          <VolumeX size={26} className="painel-tv-icone-alerta" />
          <div className="painel-tv-alerta-texto">
            <span>Áudio da TV aguardando ativação</span>
            <small>Clique em qualquer lugar da tela ou controle remoto</small>
          </div>
        </button>
      )}

      {/* Console Flutuante de Diagnóstico e Calibração de Áudio da TV */}
      <div className="painel-tv-diagnostico-flutuante">
        <div className="painel-tv-diagnostico-topo">
          <div className="painel-tv-diagnostico-badge">
            <span className={`status-ponto ${estatisticas.estado === 'running' ? 'ativo' : 'inativo'}`} />
            <span className="texto-status">
              Tizen: {estatisticas.estado} ({estatisticas.taxaAmostragem}Hz) | {estatisticas.totalEmMemoria}/{estatisticas.totalDisponivel} clips
            </span>
          </div>

          <div className="painel-tv-diagnostico-acoes">
            <button
              type="button"
              className="painel-tv-btn-mini teste"
              onClick={handleTestarChamada}
              title="Testar anúncio de voz da TV"
            >
              <Volume2 size={15} />
              <span>Testar Voz</span>
            </button>
            <button
              type="button"
              className="painel-tv-btn-mini toggle"
              onClick={() => setExibirDiagnostico(!exibirDiagnostico)}
            >
              <span>{exibirDiagnostico ? 'Ocultar' : 'Logs'}</span>
            </button>
          </div>
        </div>

        {exibirDiagnostico && (
          <div className="painel-tv-diagnostico-logs">
            {logsDiagnostico.length === 0 ? (
              <div className="painel-tv-log-linha info">Aguardando eventos...</div>
            ) : (
              logsDiagnostico.map((log) => (
                <div key={log.id} className={`painel-tv-log-linha ${log.nivel}`}>
                  <span className="log-hora">{log.carimbo}</span>
                  <span className="log-msg">{log.mensagem}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div
        className="painel-tv-canvas-fixo"
        style={{ transform: `scale(${escala})` }}
      >
        <div className="painel-tv-grid">
          {/* 1. Barra Lateral: Logo, Relógio e Data */}
          <BarraLateral />

          {/* 2. Área Central: Destaque + Últimas Chamadas Cronológicas */}
          <main className="area-principal-painel">
            <SenhaDestaque senhaAtual={senhaDestaque} emAnimacao={emAnimacao} />
            <HistoricoSenhas chamadasAnteriores={ultimasChamadas} />
          </main>

          {/* 3. Rodapé Horizontal: Letreiro Informativo */}
          <LetreiroAvisos />
        </div>
      </div>
    </div>
  );
}
