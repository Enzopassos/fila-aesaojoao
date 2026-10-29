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
  carregarVozesDisponiveis
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
  const timerAnimacao = useRef(null);

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

  // Desbloqueia o subsistema de áudio e pré-carrega as vozes do navegador
  const desbloquearAudio = useCallback(async () => {
    await inicializarContextoAudio();
    await carregarVozesDisponiveis();
    setAudioDesbloqueado(true);
  }, []);

  // Ouvinte de interação para desbloqueio passivo (clique ou toque do usuário)
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
        setSenhaDestaque(senhaFormatada);
        dispararAlertaVisualESonoro(senhaFormatada);

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
          setSenhaDestaque(senhaEfetiva);
          dispararAlertaVisualESonoro(senhaEfetiva);
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
  }, [carregarDadosIniciais, dispararAlertaVisualESonoro]);

  const handleTestarChamada = (e) => {
    e.stopPropagation();
    anunciarChamada(
      senhaDestaque?.codigo_formatado || 'A001',
      senhaDestaque?.guiche || senhaDestaque?.guiche_numero || '01'
    );
  };

  return (
    <div className="painel-tv-palco-externo">
      {/* Alerta de desbloqueio de áudio caso o navegador tenha suspendido por autoplay policy */}
      {!audioDesbloqueado ? (
        <button
          type="button"
          className="painel-tv-alerta-audio"
          onClick={desbloquearAudio}
        >
          <VolumeX size={26} className="painel-tv-icone-alerta" />
          <div className="painel-tv-alerta-texto">
            <span>Áudio da TV aguardando ativação</span>
            <small>Toque em qualquer lugar da tela para habilitar o som</small>
          </div>
        </button>
      ) : (
        <button
          type="button"
          className="painel-tv-botao-teste-audio"
          onClick={handleTestarChamada}
          title="Clique para testar a voz estilo Correios"
        >
          <Volume2 size={18} />
          <span>Testar Voz Correios</span>
        </button>
      )}

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
