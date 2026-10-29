import { supabase, SISTEMA_ID } from './supabaseCliente';

/**
 * Serviço de Gestão de Categorias e Filas de Atendimento
 * Integração direta com a tabela fila_categorias no Supabase.
 */
export const categoriaServico = {
  /**
   * Lista todas as categorias de atendimento cadastradas para o sistema.
   * Ordena por prioridade legal decrescente e nome alfabético.
   * @param {boolean} apenasAtivas - Se true, retorna apenas categorias ativas.
   */
  listarCategorias: async (apenasAtivas = false) => {
    let consulta = supabase
      .from('fila_categorias')
      .select('*')
      .eq('sistema_id', SISTEMA_ID)
      .order('prioridade', { ascending: false })
      .order('nome', { ascending: true });

    if (apenasAtivas) {
      consulta = consulta.eq('ativo', true);
    }

    const { data, error } = await consulta;

    if (error) {
      console.error('[categoriaServico] Erro ao listar categorias:', error);
      throw new Error(`Falha ao carregar as categorias: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Cadastra uma nova categoria de atendimento.
   * @param {Object} dadosCategoria
   * @param {string} dadosCategoria.nome - Nome da categoria (ex: "Auto Escola").
   * @param {string} dadosCategoria.prefixo - Letra do prefixo da senha (ex: "A").
   * @param {boolean} [dadosCategoria.prioridade=false] - Se a categoria possui prioridade legal.
   * @param {string} [dadosCategoria.cor_badge] - Cor hexadecimal do texto/borda do badge.
   * @param {string} [dadosCategoria.cor_fundo] - Cor hexadecimal de preenchimento do badge.
   */
  criarCategoria: async ({
    nome,
    prefixo,
    prioridade = false,
    cor_badge = '#2563eb',
    cor_fundo = '#dbeafe'
  }) => {
    const nomeLimpo = String(nome || '').trim();
    const prefixoLimpo = String(prefixo || '').trim().toUpperCase();

    if (!nomeLimpo || !prefixoLimpo) {
      throw new Error('Nome e prefixo da categoria são obrigatórios.');
    }

    const novaCategoria = {
      sistema_id: SISTEMA_ID,
      nome: nomeLimpo,
      prefixo: prefixoLimpo,
      prioridade: Boolean(prioridade),
      cor_badge: cor_badge || (prioridade ? '#d97706' : '#2563eb'),
      cor_fundo: cor_fundo || (prioridade ? '#fef3c7' : '#dbeafe'),
      ativo: true
    };

    const { data, error } = await supabase
      .from('fila_categorias')
      .insert([novaCategoria])
      .select()
      .single();

    if (error) {
      console.error('[categoriaServico] Erro ao criar categoria:', error);
      throw new Error(`Falha ao cadastrar categoria: ${error.message}`);
    }

    return data;
  },

  /**
   * Atualiza uma categoria de atendimento existente.
   * @param {string} id - UUID da categoria.
   * @param {Object} dados
   */
  atualizarCategoria: async (id, dados) => {
    if (!id) throw new Error('Identificador da categoria não fornecido.');

    const dadosAtualizacao = {};
    if (dados.nome !== undefined) {
      dadosAtualizacao.nome = String(dados.nome).trim();
    }
    if (dados.prefixo !== undefined) {
      dadosAtualizacao.prefixo = String(dados.prefixo).trim().toUpperCase();
    }
    if (dados.prioridade !== undefined) {
      dadosAtualizacao.prioridade = Boolean(dados.prioridade);
    }
    if (dados.cor_badge !== undefined) {
      dadosAtualizacao.cor_badge = dados.cor_badge;
    }
    if (dados.cor_fundo !== undefined) {
      dadosAtualizacao.cor_fundo = dados.cor_fundo;
    }
    if (dados.ativo !== undefined) {
      dadosAtualizacao.ativo = Boolean(dados.ativo);
    }

    const { data, error } = await supabase
      .from('fila_categorias')
      .update(dadosAtualizacao)
      .eq('id', id)
      .eq('sistema_id', SISTEMA_ID)
      .select()
      .single();

    if (error) {
      console.error('[categoriaServico] Erro ao atualizar categoria:', error);
      throw new Error(`Falha ao atualizar categoria: ${error.message}`);
    }

    return data;
  },

  /**
   * Altera a ativação da categoria.
   * @param {string} id - UUID da categoria.
   * @param {boolean} ativo
   */
  alternarStatusCategoria: async (id, ativo) => {
    if (!id) throw new Error('Identificador da categoria não fornecido.');

    const { data, error } = await supabase
      .from('fila_categorias')
      .update({ ativo: Boolean(ativo) })
      .eq('id', id)
      .eq('sistema_id', SISTEMA_ID)
      .select()
      .single();

    if (error) {
      console.error('[categoriaServico] Erro ao alternar status da categoria:', error);
      throw new Error(`Falha ao alternar status da categoria: ${error.message}`);
    }

    return data;
  },

  /**
   * Remove uma categoria.
   * @param {string} id - UUID da categoria.
   */
  excluirCategoria: async (id) => {
    if (!id) throw new Error('Identificador da categoria não fornecido.');

    const { error } = await supabase
      .from('fila_categorias')
      .delete()
      .eq('id', id)
      .eq('sistema_id', SISTEMA_ID);

    if (error) {
      console.error('[categoriaServico] Erro ao excluir categoria:', error);
      throw new Error(`Falha ao excluir categoria: ${error.message}`);
    }

    return true;
  }
};
