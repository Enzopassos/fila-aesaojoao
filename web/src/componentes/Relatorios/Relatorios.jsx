import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PieChart,
  BarChart3,
  CheckCircle2,
  Clock,
  Timer,
  UserX,
  Users,
  AlertCircle,
  Inbox,
  Filter
} from 'lucide-react';
import {
  relatorioServico,
  calcularMediana,
  calcularMediaSaneada,
  formatarDuracao
} from '../../servicos/relatorioServico';
import { CabecalhoPagina } from '../CabecalhoPagina';
import './Relatorios.css';

// Paleta corporativa de cores para fatias e legendas de categorias
const CORES_CATEGORIAS_PADRAO = {
  prioritario: '#d97706',
  prioritário: '#d97706',
  despachante: '#2563eb',
  'auto escola': '#059669',
  'exames / biometria': '#7c3aed',
  exames: '#7c3aed'
};

const CORES_PALETA_SOBRA = [
  '#2563eb',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#0891b2',
  '#ec4899',
  '#475569'
];

export function Relatorios() {
  const [periodo, setPeriodo] = useState('hoje');
  const [atendenteId, setAtendenteId] = useState('todos');
  const [dadosBrutos, setDadosBrutos] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const carregarRelatorio = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const metricas = await relatorioServico.obterMetricasGerais({ periodo });
      setDadosBrutos(metricas);
    } catch (err) {
      console.error('[Relatorios] Erro ao carregar métricas:', err);
      setErro(err?.message || 'Falha ao processar os indicadores analíticos.');
    } finally {
      setCarregando(false);
    }
  }, [periodo]);

  useEffect(() => {
    carregarRelatorio();
  }, [carregarRelatorio]);

  // Lista única de atendentes disponíveis no período para o dropdown de filtro
  const listaAtendentes = useMemo(() => {
    return dadosBrutos?.atendentes || [];
  }, [dadosBrutos]);

  // Senhas filtradas reativamente em memória com base no atendente selecionado (0ms)
  const senhasFiltradas = useMemo(() => {
    const todas = dadosBrutos?.todasSenhas || [];
    if (atendenteId === 'todos') return todas;
    return todas.filter((s) => s.atendente_id === atendenteId);
  }, [dadosBrutos, atendenteId]);

  // Nome do atendente ativo para o banner de contexto
  const atendenteAtivoObj = useMemo(() => {
    if (atendenteId === 'todos') return null;
    return listaAtendentes.find((a) => a.id === atendenteId) || null;
  }, [atendenteId, listaAtendentes]);

  // 1. Recálculo reativo dos KPIs com base no atendente selecionado
  const kpis = useMemo(() => {
    const totalEmitidas = senhasFiltradas.length;
    const concluidas = senhasFiltradas.filter((s) => s.status === 'concluido');
    const ausentes = senhasFiltradas.filter((s) => s.status === 'ausente');

    // Durações de atendimento
    const duracoesAtendimento = [];
    concluidas.forEach((s) => {
      const inicio = s.iniciado_em || s.chamado_em;
      const fim = s.finalizado_em;
      if (inicio && fim) {
        const diffSeg = (new Date(fim).getTime() - new Date(inicio).getTime()) / 1000;
        if (diffSeg > 0) duracoesAtendimento.push(diffSeg);
      }
    });

    // Tempos de espera
    const temposEspera = [];
    senhasFiltradas.forEach((s) => {
      if (s.gerado_em && s.chamado_em) {
        const diffSeg = (new Date(s.chamado_em).getTime() - new Date(s.gerado_em).getTime()) / 1000;
        if (diffSeg > 0) temposEspera.push(diffSeg);
      }
    });

    const totalFinalizadas = concluidas.length + ausentes.length;
    const taxaAusencia = totalFinalizadas > 0
      ? Math.round((ausentes.length / totalFinalizadas) * 100)
      : 0;

    const tmaMedianoSeg = calcularMediana(duracoesAtendimento);
    const tmaSaneadoSeg = calcularMediaSaneada(duracoesAtendimento);
    const tmeMedianoSeg = calcularMediana(temposEspera);

    return {
      totalEmitidas,
      totalConcluidas: concluidas.length,
      totalAusentes: ausentes.length,
      taxaAusencia,
      tmaMedianoFormatado: concluidas.length > 0 ? formatarDuracao(tmaMedianoSeg) : '--',
      tmaSaneadoFormatado: concluidas.length > 0 ? formatarDuracao(tmaSaneadoSeg) : '--',
      tmeMedianoFormatado: totalEmitidas > 0 ? formatarDuracao(tmeMedianoSeg) : '--'
    };
  }, [senhasFiltradas]);

  // 2. Gráfico Donut de Categorias (SVG Nativo com proporção de arcos)
  const dadosDonutCategorias = useMemo(() => {
    const contagemPorCategoria = {};
    const duracoesPorCategoria = {};

    senhasFiltradas.forEach((s) => {
      const nomeCat = s.tipo_servico || 'Geral';
      contagemPorCategoria[nomeCat] = (contagemPorCategoria[nomeCat] || 0) + 1;

      if (s.status === 'concluido') {
        const inicio = s.iniciado_em || s.chamado_em;
        const fim = s.finalizado_em;
        if (inicio && fim) {
          const diff = (new Date(fim).getTime() - new Date(inicio).getTime()) / 1000;
          if (diff > 0) {
            if (!duracoesPorCategoria[nomeCat]) duracoesPorCategoria[nomeCat] = [];
            duracoesPorCategoria[nomeCat].push(diff);
          }
        }
      }
    });

    const total = senhasFiltradas.length;
    if (total === 0) return { itens: [], segmentos: [], total: 0 };

    const itens = Object.entries(contagemPorCategoria)
      .map(([nome, quantidade], idx) => {
        const porcentagem = (quantidade / total) * 100;
        const chaveNorm = nome.trim().toLowerCase();
        const cor = CORES_CATEGORIAS_PADRAO[chaveNorm] || CORES_PALETA_SOBRA[idx % CORES_PALETA_SOBRA.length];
        const tmaCat = calcularMediana(duracoesPorCategoria[nome] || []);

        return {
          nome,
          quantidade,
          porcentagem,
          cor,
          tmaFormatado: formatarDuracao(tmaCat)
        };
      })
      .sort((a, b) => b.quantidade - a.quantidade);

    // Cálculos de geometria do anel SVG Donut (raio 58, circunferência ~364.42)
    const raio = 58;
    const circunferencia = 2 * Math.PI * raio;
    let deslocamentoAcumulado = 0;

    const segmentos = itens.map((item) => {
      const comprimentoSegmento = (item.porcentagem / 100) * circunferencia;
      const strokeDasharray = `${comprimentoSegmento} ${circunferencia - comprimentoSegmento}`;
      const strokeDashoffset = -deslocamentoAcumulado;
      deslocamentoAcumulado += comprimentoSegmento;

      return {
        ...item,
        strokeDasharray,
        strokeDashoffset
      };
    });

    return { itens, segmentos, total };
  }, [senhasFiltradas]);

  // 3. Gráfico de Colunas de Guichês (SVG/CSS com proporção vertical)
  const dadosBarrasGuiches = useMemo(() => {
    const mapa = {};
    senhasFiltradas.forEach((s) => {
      if (s.status === 'concluido' && s.guiche_numero) {
        const num = String(s.guiche_numero).padStart(2, '0');
        mapa[num] = (mapa[num] || 0) + 1;
      }
    });

    const chavesGuiches = Object.keys(mapa).sort((a, b) => a.localeCompare(b));
    const totalGeral = chavesGuiches.reduce((acc, k) => acc + mapa[k], 0);

    if (chavesGuiches.length === 0) {
      return { itens: [], totalGeral: 0 };
    }

    const valorMaximo = Math.max(1, ...Object.values(mapa)) * 1.18;

    const itens = chavesGuiches.map((numero) => {
      const total = mapa[numero];
      const alturaPercentual = Math.max(8, Math.round((total / valorMaximo) * 100));

      return {
        numero,
        total,
        alturaPercentual
      };
    });

    return { itens, totalGeral };
  }, [senhasFiltradas]);

  return (
    <div className="relatorios-container">
      <CabecalhoPagina
        icone={BarChart3}
        titulo="Relatórios & Métricas Operacionais"
        subtitulo="Visão executiva de produtividade, tempos de atendimento e fluxo de clientes com eliminação de distorções estatísticas."
      />

      {/* Barra Dedicada de Filtros Operacionais */}
      <section className="relatorios-barra-filtros" aria-label="Filtros analíticos">
        {/* Seletor de Período em Pílulas */}
        <div className="periodo-seletor-grupo" role="group" aria-label="Filtro de período">
          <button
            type="button"
            className={`btn-periodo-opcao ${periodo === 'hoje' ? 'periodo-ativo' : ''}`}
            onClick={() => setPeriodo('hoje')}
          >
            Hoje
          </button>
          <button
            type="button"
            className={`btn-periodo-opcao ${periodo === '7dias' ? 'periodo-ativo' : ''}`}
            onClick={() => setPeriodo('7dias')}
          >
            Últimos 7 dias
          </button>
          <button
            type="button"
            className={`btn-periodo-opcao ${periodo === 'mes_atual' ? 'periodo-ativo' : ''}`}
            onClick={() => setPeriodo('mes_atual')}
          >
            Este Mês
          </button>
          <button
            type="button"
            className={`btn-periodo-opcao ${periodo === '30dias' ? 'periodo-ativo' : ''}`}
            onClick={() => setPeriodo('30dias')}
          >
            Últimos 30 dias
          </button>
          <button
            type="button"
            className={`btn-periodo-opcao ${periodo === 'tudo' ? 'periodo-ativo' : ''}`}
            onClick={() => setPeriodo('tudo')}
          >
            Todos
          </button>
        </div>

        {/* Filtro Dropdown de Atendente / Operador */}
        <div className="filtro-atendente-wrapper">
          <Users size={18} className="filtro-atendente-icone" />
          <select
            className="select-atendente"
            value={atendenteId}
            onChange={(e) => setAtendenteId(e.target.value)}
            title="Filtrar dados por atendente específico"
          >
            <option value="todos">Todos os Atendentes</option>
            {listaAtendentes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Banner Contextual quando um Atendente está selecionado */}
      {atendenteAtivoObj && (
        <div className="banner-filtro-individual">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Filter size={18} />
            <span>
              Exibindo desempenho individual de: <strong>{atendenteAtivoObj.nome}</strong> ({kpis.totalConcluidas} {kpis.totalConcluidas === 1 ? 'atendimento finalizado' : 'atendimentos finalizados'} no período).
            </span>
          </div>
          <button
            type="button"
            className="btn-limpar-filtro-usuario"
            onClick={() => setAtendenteId('todos')}
          >
            Ver Todos os Atendentes
          </button>
        </div>
      )}

      {erro && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: '#991b1b'
        }}>
          <AlertCircle size={20} />
          <span>{erro}</span>
        </div>
      )}

      {/* 4 Cards de Indicadores Centrais (KPIs) */}
      <section className="relatorios-kpis-grade">
        {/* KPI 1: Atendimentos Concluídos */}
        <div className="kpi-card kpi-verde">
          <div className="kpi-card-header">
            <span className="kpi-rotulo">Atendimentos Concluídos</span>
            <div className="kpi-icone-caixa">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="kpi-valor-principal">
            {carregando ? '--' : kpis.totalConcluidas}
          </div>
          <div className="kpi-detalhe-rodape">
            <span>{kpis.totalEmitidas} senhas emitidas no período</span>
          </div>
        </div>

        {/* KPI 4: Ausências e Não Comparecimento */}
        <div className="kpi-card kpi-laranja">
          <div className="kpi-card-header">
            <span className="kpi-rotulo">Não Compareceu</span>
            <div className="kpi-icone-caixa">
              <UserX size={20} />
            </div>
          </div>
          <div className="kpi-valor-principal">
            {carregando ? '--' : kpis.totalAusentes}
          </div>
          <div className="kpi-detalhe-rodape">
            <span>Taxa de ausência: <strong>{kpis.taxaAusencia}%</strong></span>
          </div>
        </div>

        {/* KPI 2: Tempo Típico de Atendimento (TMA Mediano) */}
        <div className="kpi-card kpi-azul">
          <div className="kpi-card-header">
            <span className="kpi-rotulo">Tempo Típico (TMA)</span>
            <div className="kpi-icone-caixa">
              <Clock size={20} />
            </div>
          </div>
          <div className="kpi-valor-principal">
            {carregando ? '--:--' : kpis.tmaMedianoFormatado}
          </div>
          <div className="kpi-detalhe-rodape">
            <span className="badge-saneado" title="Cálculo pela mediana: imune a atendimentos esquecidos abertos ou cliques rápidos">
              Mediana Robusta
            </span>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
              (Saneado: {kpis.tmaSaneadoFormatado})
            </span>
          </div>
        </div>

        {/* KPI 3: Tempo Médio de Espera na Recepção (TME) */}
        <div className="kpi-card kpi-roxo">
          <div className="kpi-card-header">
            <span className="kpi-rotulo">Espera na Fila (TME)</span>
            <div className="kpi-icone-caixa">
              <Timer size={20} />
            </div>
          </div>
          <div className="kpi-valor-principal">
            {carregando ? '--:--' : kpis.tmeMedianoFormatado}
          </div>
          <div className="kpi-detalhe-rodape">
            <span>Da emissão da ficha até o chamado</span>
          </div>
        </div>


      </section>

      {/* Grid com os 2 Gráficos Analíticos Nativos em SVG / CSS */}
      <section className="relatorios-graficos-grid">
        {/* Gráfico 1: Demanda por Categoria (Donut SVG com Legendas Proporcionais) */}
        <article className="card-grafico-relatorio">
          <div className="grafico-cabecalho">
            <div className="grafico-titulo-grupo">
              <div className="grafico-icone-header">
                <PieChart size={18} />
              </div>
              <div>
                <h3 className="grafico-titulo">Demanda por Categoria</h3>
                <p className="grafico-subtitulo">
                  {atendenteAtivoObj ? `Serviços atendidos por ${atendenteAtivoObj.nome}` : 'Distribuição de chamadas entre os serviços da autoescola'}
                </p>
              </div>
            </div>
          </div>

          {dadosDonutCategorias.total === 0 ? (
            <div className="grafico-vazio-box">
              <Inbox size={32} />
              <p>Nenhuma senha registrada no período para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="donut-layout-container">
              {/* Gráfico Donut em SVG Nativo */}
              <div className="donut-svg-wrapper">
                <svg viewBox="0 0 160 160" className="donut-svg" aria-hidden="true">
                  {/* Trilha de fundo cinza claro */}
                  <circle
                    cx="80"
                    cy="80"
                    r="58"
                    fill="none"
                    stroke="#F1F5F9"
                    strokeWidth="18"
                    className="donut-circulo-base"
                  />

                  {/* Arcos coloridos proporcionais das categorias */}
                  {dadosDonutCategorias.segmentos.map((seg, idx) => (
                    <circle
                      key={`${seg.nome}-${idx}`}
                      cx="80"
                      cy="80"
                      r="58"
                      fill="none"
                      stroke={seg.cor}
                      strokeWidth="18"
                      strokeDasharray={seg.strokeDasharray}
                      strokeDashoffset={seg.strokeDashoffset}
                      className="donut-segmento"
                    />
                  ))}
                </svg>

                {/* Centro do Donut com o Total */}
                <div className="donut-centro-info">
                  <span className="donut-centro-rotulo">Total</span>
                  <span className="donut-centro-total">{dadosDonutCategorias.total}</span>
                </div>
              </div>

              {/* Legendas com Barras de Proporção nas cores de cada Categoria */}
              <div className="donut-legendas-lista">
                {dadosDonutCategorias.itens.map((item) => (
                  <div key={item.nome} className="donut-legenda-item">
                    <div className="donut-legenda-topo">
                      <div className="donut-legenda-nome">
                        <span
                          className="donut-ponto-cor"
                          style={{ backgroundColor: item.cor }}
                        />
                        <span>{item.nome}</span>
                      </div>
                      <span className="donut-legenda-valores">
                        {item.quantidade} ({item.porcentagem.toFixed(0)}%) • TMA: {item.tmaFormatado}
                      </span>
                    </div>

                    <div className="donut-barra-trilho">
                      <div
                        className="donut-barra-preenchimento"
                        style={{
                          width: `${item.porcentagem}%`,
                          backgroundColor: item.cor
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* Gráfico 2: Volume por Guichê (Colunas Verticais em CSS/SVG) */}
        <article className="card-grafico-relatorio">
          <div className="grafico-cabecalho">
            <div className="grafico-titulo-grupo">
              <div className="grafico-icone-header">
                <BarChart3 size={18} />
              </div>
              <div>
                <h3 className="grafico-titulo">Volume por Guichê / Mesa</h3>
                <p className="grafico-subtitulo">
                  {atendenteAtivoObj ? `Postos operados por ${atendenteAtivoObj.nome}` : 'Comparativo de atendimentos concluídos por posto de trabalho'}
                </p>
              </div>
            </div>
          </div>

          {dadosBarrasGuiches.itens.length === 0 ? (
            <div className="grafico-vazio-box">
              <Inbox size={32} />
              <p>Nenhum atendimento concluído em guichê registrado no período.</p>
            </div>
          ) : (
            <div className="barras-grafico-container">
              {dadosBarrasGuiches.itens.map((item) => (
                <div key={item.numero} className="coluna-guiche-grupo">
                  <span className="coluna-guiche-valor-topo">{item.total}</span>
                  <div className="coluna-guiche-barra-wrapper">
                    <div
                      className="barra-coluna-guiche"
                      style={{ height: `${item.alturaPercentual}%` }}
                      title={`Guichê ${item.numero}: ${item.total} atendimento(s) concluído(s)`}
                    />
                  </div>
                  <span className="coluna-guiche-rotulo">Guichê {item.numero}</span>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
