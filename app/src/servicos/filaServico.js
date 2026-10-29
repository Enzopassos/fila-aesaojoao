import { supabase, SISTEMA_ID } from './supabaseCliente';

/**
 * Retorna o início do dia atual (00:00:00.000) em formato ISO para reinicialização diária do sequencial.
 */
export function obterInicioDoDiaISO() {
  const dataHoje = new Date();
  dataHoje.setHours(0, 0, 0, 0);
  return dataHoje.toISOString();
}

/**
 * Serviço de Fila e Emissão de Senhas para o Tablet
 */
export const filaServico = {
  /**
   * Gera uma nova senha na fila de espera reiniciando o sequencial diariamente por categoria.
   * @param {Object} categoria - Categoria selecionada { id, nome, prefixo, prioridade }.
   */
  gerarNovaSenha: async (categoria) => {
    if (!categoria || !categoria.id || !categoria.prefixo) {
      throw new Error('Categoria inválida para emissão de senha.');
    }

    const inicioDia = obterInicioDoDiaISO();

    // 1. Contabiliza quantas senhas desta categoria já foram geradas hoje
    const { count, error: erroContagem } = await supabase
      .from('fila_senhas')
      .select('*', { count: 'exact', head: true })
      .eq('sistema_id', SISTEMA_ID)
      .eq('categoria_id', categoria.id)
      .gte('gerado_em', inicioDia);

    if (erroContagem) {
      console.error('[filaServico] Erro ao contabilizar senhas hoje:', erroContagem);
      throw new Error(`Falha ao calcular número da senha: ${erroContagem.message}`);
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
      console.error('[filaServico] Erro ao emitir senha:', erroInsercao);
      throw new Error(`Falha ao emitir senha: ${erroInsercao.message}`);
    }

    return data;
  }
};

