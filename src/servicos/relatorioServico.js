import { supabase, SISTEMA_ID } from './supabaseCliente.js';
import { usuarioServico } from './usuarioServico.js';

/**
 * Utilitários estatísticos para tratamento robusto de métricas temporais e eliminação de outliers.
 */

/**
 * Calcula a mediana de um array de números (imune a distorções por valores extremos).
 * @param {number[]} valores - Array com números.
 * @returns {number}
 */
export function calcularMediana(valores = []) {
  if (!valores || valores.length === 0) return 0;

  const ordenados = [...valores].sort((a, b) => a - b);
  const meio = Math.floor(ordenados.length / 2);

  if (ordenados.length % 2 === 0) {
    return (ordenados[meio - 1] + ordenados[meio]) / 2;
  }
  return ordenados[meio];
}

/**
 * Calcula a média saneada (Trimmed Mean), excluindo outliers espúrios
 * (ex: atendimentos menores que 20 segundos ou maiores que 90 minutos).
 * @param {number[]} valores
 * @param {number} limiteMinSeg - Padrão 20s.
 * @param {number} limiteMaxSeg - Padrão 5400s (90 min).
 * @returns {number}
 */
export function calcularMediaSaneada(valores = [], limiteMinSeg = 20, limiteMaxSeg = 5400) {
  if (!valores || valores.length === 0) return 0;

  // Filtro de corte de ruído operacional
  let filtrados = valores.filter((v) => v >= limiteMinSeg && v <= limiteMaxSeg);
  if (filtrados.length === 0) {
    // Se todos forem fora do limite, recorre à mediana geral
    return calcularMediana(valores);
  }

  // Se houver pelo menos 10 registros, apara os 10% menores e 10% maiores
  if (filtrados.length >= 10) {
    const corte = Math.floor(filtrados.length * 0.1);
    const ordenados = [...filtrados].sort((a, b) => a - b);
    filtrados = ordenados.slice(corte, ordenados.length - corte);
  }

  const soma = filtrados.reduce((acc, curr) => acc + curr, 0);
  return soma / filtrados.length;
}

/**
 * Formata um tempo em segundos para representação textual amigável (ex: "04m 32s").
 * @param {number} segundos
 * @returns {string}
 */
export function formatarDuracao(segundos) {
  if (!segundos || isNaN(segundos) || segundos <= 0) {
    return '00m 00s';
  }

  const segInt = Math.round(segundos);
  const horas = Math.floor(segInt / 3600);
  const minutos = Math.floor((segInt % 3600) / 60);
  const segRestantes = segInt % 60;

  if (horas > 0) {
    return `${horas}h ${String(minutos).padStart(2, '0')}m`;
  }

  return `${String(minutos).padStart(2, '0')}m ${String(segRestantes).padStart(2, '0')}s`;
}

/**
 * Serviço de Consolidação e Relatórios Analíticos (BI)
 */
export const relatorioServico = {
  /**
   * Obtém os dados de atendimentos e computa todos os indicadores do período selecionado.
   * @param {Object} params
   * @param {'hoje'|'7dias'|'30dias'|'mes_atual'|'tudo'} [params.periodo='hoje']
   * @param {string} [params.dataInicio] - ISO string opcional
   * @param {string} [params.dataFim] - ISO string opcional
   */
  obterMetricasGerais: async ({ periodo = 'hoje', dataInicio = null, dataFim = null } = {}) => {
    let filtroDataInicio = null;
    let filtroDataFim = null;
    const agora = new Date();

    switch (periodo) {
      case 'hoje': {
        const d = new Date(agora);
        d.setHours(0, 0, 0, 0);
        filtroDataInicio = d.toISOString();
        break;
      }
      case '7dias': {
        const d = new Date(agora);
        d.setDate(d.getDate() - 7);
        d.setHours(0, 0, 0, 0);
        filtroDataInicio = d.toISOString();
        break;
      }
      case '30dias': {
        const d = new Date(agora);
        d.setDate(d.getDate() - 30);
        d.setHours(0, 0, 0, 0);
        filtroDataInicio = d.toISOString();
        break;
      }
      case 'mes_atual': {
        const d = new Date(agora.getFullYear(), agora.getMonth(), 1, 0, 0, 0);
        filtroDataInicio = d.toISOString();
        break;
      }
      case 'personalizado': {
        if (dataInicio) filtroDataInicio = new Date(dataInicio).toISOString();
        if (dataFim) {
          const df = new Date(dataFim);
          df.setHours(23, 59, 59, 999);
          filtroDataFim = df.toISOString();
        }
        break;
      }
      case 'tudo':
      default:
        filtroDataInicio = null;
        break;
    }

    let consulta = supabase
      .from('fila_senhas')
      .select('*, core_perfis(id, nome_completo, email)')
      .eq('sistema_id', SISTEMA_ID)
      .order('gerado_em', { ascending: false });

    if (filtroDataInicio) {
      consulta = consulta.gte('gerado_em', filtroDataInicio);
    }
    if (filtroDataFim) {
      consulta = consulta.lte('gerado_em', filtroDataFim);
    }

    const [respostaSenhas, listaUsuariosCadastrados] = await Promise.all([
      consulta,
      usuarioServico.listarUsuarios().catch((erroUsuarios) => {
        console.warn('[relatorioServico] Falha ao carregar lista de colaboradores cadastrados:', erroUsuarios);
        return [];
      })
    ]);

    const { data: senhas, error } = respostaSenhas;

    if (error) {
      console.error('[relatorioServico] Erro ao consultar senhas para relatório:', error);
      throw new Error(`Falha ao obter dados analíticos: ${error.message}`);
    }

    const listaSenhas = senhas || [];

    // 1. Contagens gerais
    const totalEmitidas = listaSenhas.length;
    const concluidas = listaSenhas.filter((s) => s.status === 'concluido');
    const ausentes = listaSenhas.filter((s) => s.status === 'ausente');
    const aguardando = listaSenhas.filter((s) => s.status === 'aguardando');
    const emAtendimentoOuChamado = listaSenhas.filter((s) => s.status === 'chamado' || s.status === 'em_atendimento');

    // 2. Extração de durações de atendimento (TMA)
    const duracoesAtendimento = [];
    concluidas.forEach((s) => {
      const inicio = s.iniciado_em || s.chamado_em;
      const fim = s.finalizado_em;
      if (inicio && fim) {
        const diffSeg = (new Date(fim).getTime() - new Date(inicio).getTime()) / 1000;
        if (diffSeg > 0) {
          duracoesAtendimento.push(diffSeg);
        }
      }
    });

    // 3. Extração de tempos de espera na fila (TME: gerado_em até chamado_em)
    const temposEspera = [];
    listaSenhas.forEach((s) => {
      if (s.gerado_em && s.chamado_em) {
        const diffSeg = (new Date(s.chamado_em).getTime() - new Date(s.gerado_em).getTime()) / 1000;
        if (diffSeg > 0) {
          temposEspera.push(diffSeg);
        }
      }
    });

    // Métricas centrais
    const tmaMedianoSegundos = calcularMediana(duracoesAtendimento);
    const tmaSaneadoSegundos = calcularMediaSaneada(duracoesAtendimento);
    const tmeMedianoSegundos = calcularMediana(temposEspera);

    const totalFinalizadas = concluidas.length + ausentes.length;
    const taxaComparecimento = totalFinalizadas > 0
      ? Math.round((concluidas.length / totalFinalizadas) * 100)
      : 0;
    const taxaAusencia = totalFinalizadas > 0
      ? Math.round((ausentes.length / totalFinalizadas) * 100)
      : 0;

    // 4. Agrupamento por Atendente (Todos os colaboradores ativos + atendentes com histórico)
    const mapaAtendentes = {};

    // 4.1 Inicializa todos os colaboradores ativos do sistema para auditoria completa
    (listaUsuariosCadastrados || [])
      .filter((u) => u.ativo !== false)
      .forEach((u) => {
        mapaAtendentes[u.usuario_id] = {
          id: u.usuario_id,
          nome: u.nome_completo || u.email || 'Colaborador',
          email: u.email || '',
          totalChamadas: 0,
          concluidas: 0,
          ausentes: 0,
          duracoes: []
        };
      });

    // 4.2 Computa as senhas do período selecionado
    listaSenhas.forEach((s) => {
      if (!s.atendente_id) return;

      const idAtendente = s.atendente_id;
      const nomeAtendente = s.core_perfis?.nome_completo || s.core_perfis?.email || 'Atendente não vinculado';

      if (!mapaAtendentes[idAtendente]) {
        mapaAtendentes[idAtendente] = {
          id: idAtendente,
          nome: nomeAtendente,
          email: s.core_perfis?.email || '',
          totalChamadas: 0,
          concluidas: 0,
          ausentes: 0,
          duracoes: []
        };
      }

      if (s.status === 'concluido' || s.status === 'ausente') {
        mapaAtendentes[idAtendente].totalChamadas += 1;
      }
      if (s.status === 'concluido') {
        mapaAtendentes[idAtendente].concluidas += 1;
        const inicio = s.iniciado_em || s.chamado_em;
        const fim = s.finalizado_em;
        if (inicio && fim) {
          const diff = (new Date(fim).getTime() - new Date(inicio).getTime()) / 1000;
          if (diff > 0) mapaAtendentes[idAtendente].duracoes.push(diff);
        }
      } else if (s.status === 'ausente') {
        mapaAtendentes[idAtendente].ausentes += 1;
      }
    });

    const estatisticasAtendentes = Object.values(mapaAtendentes)
      .map((a) => {
        const med = calcularMediana(a.duracoes);
        const percentual = concluidas.length > 0
          ? Math.round((a.concluidas / concluidas.length) * 100)
          : 0;

        return {
          id: a.id,
          nome: a.nome,
          email: a.email,
          totalChamadas: a.totalChamadas,
          concluidas: a.concluidas,
          ausentes: a.ausentes,
          tmaMedianoFormatado: a.concluidas > 0 ? formatarDuracao(med) : '--',
          tmaMedianoSegundos: med,
          participacaoPercentual: percentual
        };
      })
      .sort((a, b) => a.nome.localeCompare(b.nome));

    // 5. Agrupamento por Categoria de Serviço
    const mapaCategorias = {};
    listaSenhas.forEach((s) => {
      const catKey = s.tipo_servico || 'Geral';
      if (!mapaCategorias[catKey]) {
        mapaCategorias[catKey] = {
          nome: catKey,
          preferencial: s.preferencial,
          total: 0,
          concluidas: 0,
          ausentes: 0,
          duracoes: []
        };
      }

      mapaCategorias[catKey].total += 1;
      if (s.status === 'concluido') {
        mapaCategorias[catKey].concluidas += 1;
        const inicio = s.iniciado_em || s.chamado_em;
        const fim = s.finalizado_em;
        if (inicio && fim) {
          const diff = (new Date(fim).getTime() - new Date(inicio).getTime()) / 1000;
          if (diff > 0) mapaCategorias[catKey].duracoes.push(diff);
        }
      } else if (s.status === 'ausente') {
        mapaCategorias[catKey].ausentes += 1;
      }
    });

    const estatisticasCategorias = Object.values(mapaCategorias)
      .map((c) => ({
        nome: c.nome,
        preferencial: c.preferencial,
        total: c.total,
        concluidas: c.concluidas,
        ausentes: c.ausentes,
        tmaMedianoFormatado: formatarDuracao(calcularMediana(c.duracoes))
      }))
      .sort((a, b) => b.total - a.total);

    // 6. Agrupamento por Guichê
    const mapaGuiches = {};
    listaSenhas.forEach((s) => {
      const numGuiche = s.guiche_numero || '00';
      if (!mapaGuiches[numGuiche]) {
        mapaGuiches[numGuiche] = {
          guiche: numGuiche,
          total: 0,
          concluidas: 0
        };
      }
      mapaGuiches[numGuiche].total += 1;
      if (s.status === 'concluido') {
        mapaGuiches[numGuiche].concluidas += 1;
      }
    });

    const estatisticasGuiches = Object.values(mapaGuiches)
      .sort((a, b) => a.guiche.localeCompare(b.guiche));

    return {
      kpis: {
        totalEmitidas,
        totalConcluidas: concluidas.length,
        totalAusentes: ausentes.length,
        aguardando: aguardando.length,
        emAtendimentoOuChamado: emAtendimentoOuChamado.length,
        taxaComparecimento,
        taxaAusencia,
        tmaMedianoFormatado: formatarDuracao(tmaMedianoSegundos),
        tmaSaneadoFormatado: formatarDuracao(tmaSaneadoSegundos),
        tmeMedianoFormatado: formatarDuracao(tmeMedianoSegundos)
      },
      atendentes: estatisticasAtendentes,
      categorias: estatisticasCategorias,
      guiches: estatisticasGuiches,
      senhasRecentes: listaSenhas.slice(0, 15),
      todasSenhas: listaSenhas
    };
  }
};
