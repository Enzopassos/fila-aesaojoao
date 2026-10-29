import { supabase, SISTEMA_ID } from './supabaseCliente';
import { enviarEvento } from './canalSincronizacao';

/**
 * Retorna o início do dia atual (00:00:00.000) em formato ISO para filtros de senhas diárias.
 */
export function obterInicioDoDiaISO() {
  const dataHoje = new Date();
  dataHoje.setHours(0, 0, 0, 0);
  return dataHoje.toISOString();
}

/**
 * Serviço de Gestão e Operação de Filas e Senhas
 * Integração direta com a tabela fila_senhas no Supabase e Supabase Realtime.
 */
export const filaServico = {
  /**
   * Lista todas as senhas aguardando atendimento criadas no dia de hoje.
   * Ordena por prioridade legal decrescente e ordem de chegada (gerado_em asc).
   */
  listarSenhasAguardando: async () => {
    const inicioDia = obterInicioDoDiaISO();

    const { data, error } = await supabase
      .from('fila_senhas')
      .select('*')
      .eq('sistema_id', SISTEMA_ID)
      .eq('status', 'aguardando')
      .gte('gerado_em', inicioDia)
      .order('preferencial', { ascending: false })
      .order('gerado_em', { ascending: true });

    if (error) {
      console.error('[filaServico] Erro ao listar senhas aguardando:', error);
      throw new Error(`Falha ao consultar fila de espera: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Obtém a senha que está em destaque atual na TV (última chamada ou em atendimento).
   */
  obterSenhaDestaqueAtual: async () => {
    const inicioDia = obterInicioDoDiaISO();

    const { data, error } = await supabase
      .from('fila_senhas')
      .select('*')
      .eq('sistema_id', SISTEMA_ID)
      .in('status', ['chamado', 'em_atendimento'])
      .gte('gerado_em', inicioDia)
      .order('chamado_em', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[filaServico] Erro ao obter senha destaque:', error);
      return null;
    }

    if (data && data.length > 0) {
      const s = data[0];
      return {
        ...s,
        guiche: s.guiche_numero || '01'
      };
    }

    return null;
  },

  /**
   * Obtém a última chamada registrada de cada categoria para o rodapé da TV.
   */
  obterUltimasSenhasPorCategoria: async () => {
    const inicioDia = obterInicioDoDiaISO();

    const { data, error } = await supabase
      .from('fila_senhas')
      .select('*')
      .eq('sistema_id', SISTEMA_ID)
      .not('chamado_em', 'is', null)
      .gte('gerado_em', inicioDia)
      .order('chamado_em', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[filaServico] Erro ao obter últimas chamadas por categoria:', error);
      return [];
    }

    // Filtra para manter apenas a chamada mais recente de cada categoria
    const mapaCategorias = new Map();
    (data || []).forEach((item) => {
      if (!mapaCategorias.has(item.categoria_id)) {
        mapaCategorias.set(item.categoria_id, {
          ...item,
          guiche: item.guiche_numero || '01'
        });
      }
    });

    return Array.from(mapaCategorias.values());
  },

  /**
   * Obtém as últimas chamadas em ordem cronológica reversa (padrão Poupatempo/bancos).
   * Exclui a senha em destaque atual para evitar duplicações na tela da TV.
   * @param {string|null} [senhaDestaqueId=null]
   * @param {number} [limite=4]
   */
  obterUltimasChamadasCronologicas: async (senhaDestaqueId = null, limite = 4) => {
    const inicioDia = obterInicioDoDiaISO();

    const { data, error } = await supabase
      .from('fila_senhas')
      .select('*')
      .eq('sistema_id', SISTEMA_ID)
      .not('chamado_em', 'is', null)
      .gte('gerado_em', inicioDia)
      .order('chamado_em', { ascending: false })
      .limit(limite + 3);

    if (error) {
      console.error('[filaServico] Erro ao obter últimas chamadas cronológicas:', error);
      return [];
    }

    const filtradas = (data || [])
      .filter((s) => !senhaDestaqueId || s.id !== senhaDestaqueId)
      .slice(0, limite)
      .map((item) => ({
        ...item,
        guiche: item.guiche_numero || '01'
      }));

    return filtradas;
  },

  /**
   * Obtém o mapa de atendimentos ativos ('chamado' ou 'em_atendimento') por número de guichê.
   * Retorna { '01': senhaOuNull, '02': senhaOuNull, ... }
   */
  obterAtendimentosAtivosPorGuiche: async () => {
    const inicioDia = obterInicioDoDiaISO();

    const { data, error } = await supabase
      .from('fila_senhas')
      .select('*')
      .eq('sistema_id', SISTEMA_ID)
      .in('status', ['chamado', 'em_atendimento'])
      .gte('gerado_em', inicioDia)
      .order('chamado_em', { ascending: false });

    if (error) {
      console.error('[filaServico] Erro ao consultar atendimentos ativos por guichê:', error);
      return {};
    }

    const mapaAtivos = {};
    (data || []).forEach((item) => {
      const num = String(item.guiche_numero || '').padStart(2, '0');
      if (num && !mapaAtivos[num]) {
        mapaAtivos[num] = {
          ...item,
          guiche: num
        };
      }
    });

    return mapaAtivos;
  },

  /**
   * Consulta o histórico de atendimentos concluídos ou ausentes de hoje.
   * @param {string} [guicheNumero] - Opcional. Filtra por número de guichê (ex: '01').
   */
  obterHistoricoHoje: async (guicheNumero = null) => {
    const inicioDia = obterInicioDoDiaISO();

    let consulta = supabase
      .from('fila_senhas')
      .select('*')
      .eq('sistema_id', SISTEMA_ID)
      .in('status', ['concluido', 'ausente'])
      .gte('gerado_em', inicioDia)
      .order('finalizado_em', { ascending: false })
      .limit(30);

    if (guicheNumero) {
      consulta = consulta.eq('guiche_numero', String(guicheNumero).padStart(2, '0'));
    }

    const { data, error } = await consulta;

    if (error) {
      console.error('[filaServico] Erro ao obter histórico de hoje:', error);
      return [];
    }

    return (data || []).map((s) => ({
      ...s,
      guiche: s.guiche_numero || '01'
    }));
  },

  /**
   * Gera uma nova senha na fila de espera, reiniciando o sequencial diariamente por categoria.
   * @param {Object} categoria - Objeto da categoria { id, nome, prefixo, prioridade }.
   */
  gerarNovaSenha: async (categoria) => {
    if (!categoria || !categoria.id || !categoria.prefixo) {
      throw new Error('Categoria inválida para emissão de senha.');
    }

    const inicioDia = obterInicioDoDiaISO();

    // 1. Contabiliza quantas senhas desta categoria já foram geradas hoje para reiniciar diariamente
    const { count, error: erroContagem } = await supabase
      .from('fila_senhas')
      .select('*', { count: 'exact', head: true })
      .eq('sistema_id', SISTEMA_ID)
      .eq('categoria_id', categoria.id)
      .gte('gerado_em', inicioDia);

    if (erroContagem) {
      console.error('[filaServico] Erro ao contabilizar senhas da categoria hoje:', erroContagem);
      throw new Error(`Falha ao calcular próximo número da senha: ${erroContagem.message}`);
    }

    const sequencial = (count || 0) + 1;
    const codigoFormatado = `${categoria.prefixo}${String(sequencial).padStart(3, '0')}`;

    const novaSenha = {
      sistema_id: SISTEMA_ID,
      categoria_id: categoria.id,
      codigo_formatado: codigoFormatado,
      numero_sequencial: sequencial,
      tipo_servico: categoria.nome,
      preferencial: Boolean(categoria.prioridade),
      status: 'aguardando',
      chamadas_total: 0,
      gerado_em: new Date().toISOString()
    };

    const { data, error: erroInsercao } = await supabase
      .from('fila_senhas')
      .insert([novaSenha])
      .select()
      .single();

    if (erroInsercao) {
      console.error('[filaServico] Erro ao emitir nova senha:', erroInsercao);
      throw new Error(`Falha ao emitir senha: ${erroInsercao.message}`);
    }

    // Notificação complementar via BroadcastChannel
    enviarEvento('NOVA_SENHA_EMITIDA', { senha: data });

    return data;
  },

  /**
   * Localiza a próxima senha aguardando e atribui a chamada ao guichê.
   * @param {Object} params
   * @param {string} [params.guicheId] - UUID do guichê.
   * @param {string} params.guicheNumero - Número da mesa (ex: "01").
   * @param {string} [params.atendenteId] - UUID do operador em core_perfis.
   * @param {string} [params.categoriaId] - UUID opcional para filtrar por fila específica.
   */
  chamarProximoNumero: async ({ guicheId = null, guicheNumero, atendenteId = null, categoriaId = null }) => {
    if (!guicheNumero) {
      throw new Error('Informe o posto de atendimento (guichê) para efetuar a chamada.');
    }

    const inicioDia = obterInicioDoDiaISO();
    const numeroFormatado = String(guicheNumero).padStart(2, '0');

    // 1. Busca a próxima senha elegível (preferencial tem prioridade legal)
    let consulta = supabase
      .from('fila_senhas')
      .select('*')
      .eq('sistema_id', SISTEMA_ID)
      .eq('status', 'aguardando')
      .gte('gerado_em', inicioDia);

    if (categoriaId) {
      consulta = consulta.eq('categoria_id', categoriaId);
    }

    consulta = consulta
      .order('preferencial', { ascending: false })
      .order('gerado_em', { ascending: true })
      .limit(1);

    const { data: senhasElegiveis, error: erroConsulta } = await consulta;

    if (erroConsulta) {
      console.error('[filaServico] Erro ao buscar próxima senha:', erroConsulta);
      throw new Error(`Falha ao consultar próxima senha: ${erroConsulta.message}`);
    }

    if (!senhasElegiveis || senhasElegiveis.length === 0) {
      return null;
    }

    const proximaSenha = senhasElegiveis[0];
    const agora = new Date().toISOString();

    // 2. Atualiza a senha para 'chamado' com vínculo ao guichê
    const { data: senhaAtualizada, error: erroAtualizacao } = await supabase
      .from('fila_senhas')
      .update({
        status: 'chamado',
        guiche_id: guicheId,
        guiche_numero: numeroFormatado,
        atendente_id: atendenteId,
        chamado_em: agora,
        chamadas_total: (proximaSenha.chamadas_total || 0) + 1
      })
      .eq('id', proximaSenha.id)
      .eq('sistema_id', SISTEMA_ID)
      .select()
      .single();

    if (erroAtualizacao) {
      console.error('[filaServico] Erro ao chamar senha:', erroAtualizacao);
      throw new Error(`Falha ao registrar chamada da senha: ${erroAtualizacao.message}`);
    }

    const senhaComGuiche = {
      ...senhaAtualizada,
      guiche: numeroFormatado
    };

    // Dispara evento imediato complementar para a TV
    enviarEvento('CHAMAR_SENHA', {
      senha: senhaComGuiche,
      senhaDestaque: senhaComGuiche
    });

    return senhaComGuiche;
  },

  /**
   * Re-chama a senha atual (incrementa contador de chamadas e atualiza carimbo de tempo).
   * @param {string} senhaId - UUID da senha.
   * @param {string} guicheNumero - Número do guichê.
   */
  rechamarSenha: async (senhaId, guicheNumero) => {
    if (!senhaId) throw new Error('Identificador da senha não fornecido.');

    // 1. Obtém o total de chamadas atual
    const { data: senhaExistente } = await supabase
      .from('fila_senhas')
      .select('chamadas_total, codigo_formatado, tipo_servico')
      .eq('id', senhaId)
      .single();

    const totalChamadas = (senhaExistente?.chamadas_total || 1) + 1;
    const agora = new Date().toISOString();

    const { data, error } = await supabase
      .from('fila_senhas')
      .update({
        chamado_em: agora,
        chamadas_total: totalChamadas
      })
      .eq('id', senhaId)
      .eq('sistema_id', SISTEMA_ID)
      .select()
      .single();

    if (error) {
      console.error('[filaServico] Erro ao rechamar senha:', error);
      throw new Error(`Falha ao rechamar senha: ${error.message}`);
    }

    const senhaFinal = {
      ...data,
      guiche: String(guicheNumero || data.guiche_numero || '01').padStart(2, '0')
    };

    enviarEvento('RECHAMAR_SENHA', {
      senha: senhaFinal
    });

    return senhaFinal;
  },

  /**
   * Inicia o atendimento da senha.
   * @param {string} senhaId - UUID da senha.
   */
  iniciarAtendimento: async (senhaId) => {
    if (!senhaId) throw new Error('Identificador da senha não fornecido.');

    const { data, error } = await supabase
      .from('fila_senhas')
      .update({
        status: 'em_atendimento',
        iniciado_em: new Date().toISOString()
      })
      .eq('id', senhaId)
      .eq('sistema_id', SISTEMA_ID)
      .select()
      .single();

    if (error) {
      console.error('[filaServico] Erro ao iniciar atendimento:', error);
      throw new Error(`Falha ao iniciar atendimento: ${error.message}`);
    }

    enviarEvento('INICIAR_ATENDIMENTO', { senha: data });
    return data;
  },

  /**
   * Conclui o atendimento de uma senha.
   * @param {string} senhaId - UUID da senha.
   */
  finalizarAtendimento: async (senhaId) => {
    if (!senhaId) throw new Error('Identificador da senha não fornecido.');

    const { data, error } = await supabase
      .from('fila_senhas')
      .update({
        status: 'concluido',
        finalizado_em: new Date().toISOString()
      })
      .eq('id', senhaId)
      .eq('sistema_id', SISTEMA_ID)
      .select()
      .single();

    if (error) {
      console.error('[filaServico] Erro ao finalizar atendimento:', error);
      throw new Error(`Falha ao finalizar atendimento: ${error.message}`);
    }

    enviarEvento('FINALIZAR_ATENDIMENTO', { senha: data });
    return data;
  },

  /**
   * Marca o cliente da senha como ausente.
   * @param {string} senhaId - UUID da senha.
   */
  marcarAusente: async (senhaId) => {
    if (!senhaId) throw new Error('Identificador da senha não fornecido.');

    const { data, error } = await supabase
      .from('fila_senhas')
      .update({
        status: 'ausente',
        finalizado_em: new Date().toISOString()
      })
      .eq('id', senhaId)
      .eq('sistema_id', SISTEMA_ID)
      .select()
      .single();

    if (error) {
      console.error('[filaServico] Erro ao marcar ausente:', error);
      throw new Error(`Falha ao registrar ausência: ${error.message}`);
    }

    enviarEvento('MARCAR_AUSENTE', { senha: data });
    return data;
  },

  /**
   * Inscreve-se nas alterações em tempo real da tabela fila_senhas no Supabase Realtime.
   * @param {Function} callback - Função invocada ao receber inserção ou atualização de senha.
   * @returns {Function} Função de limpeza para encerrar o canal.
   */
  inscreverMudancasFila: (callback) => {
    const nomeCanal = `fila_tempo_real_${Date.now()}`;

    const canal = supabase
      .channel(nomeCanal)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'fila_senhas',
          filter: `sistema_id=eq.${SISTEMA_ID}`
        },
        (payload) => {
          if (typeof callback === 'function') {
            callback(payload);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Canal conectado com sucesso ao Supabase Realtime
        }
      });

    return () => {
      supabase.removeChannel(canal);
    };
  }
};
