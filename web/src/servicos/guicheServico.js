import { supabase, SISTEMA_ID } from './supabaseCliente';

/**
 * Serviço de Gestão de Guichês de Atendimento
 * Integração direta com a tabela fila_guiches no Supabase.
 */
export const guicheServico = {
  /**
   * Lista todos os guichês cadastrados para o sistema atual.
   * @param {boolean} apenasAtivos - Se true, filtra apenas os guichês ativos.
   */
  listarGuiches: async (apenasAtivos = false) => {
    let consulta = supabase
      .from('fila_guiches')
      .select('*')
      .eq('sistema_id', SISTEMA_ID)
      .order('numero', { ascending: true });

    if (apenasAtivos) {
      consulta = consulta.eq('ativo', true);
    }

    const { data, error } = await consulta;

    if (error) {
      console.error('[guicheServico] Erro ao listar guichês:', error);
      throw new Error(`Falha ao carregar os guichês: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Cadastra um novo posto de trabalho / guichê.
   * @param {Object} dadosGuiche
   * @param {string} dadosGuiche.numero - Número ou identificador da mesa (ex: "01").
   * @param {string} dadosGuiche.nome - Nome do guichê (ex: "Guichê 01").
   * @param {string} [dadosGuiche.descricao] - Descrição das funções do guichê.
   */
  criarGuiche: async ({ numero, nome, descricao = '' }) => {
    const numeroLimpo = String(numero || '').trim().padStart(2, '0');
    const nomeLimpo = String(nome || '').trim();

    if (!numeroLimpo || !nomeLimpo) {
      throw new Error('Número e nome do guichê são campos obrigatórios.');
    }

    const novoGuiche = {
      sistema_id: SISTEMA_ID,
      numero: numeroLimpo,
      nome: nomeLimpo,
      descricao: String(descricao || '').trim(),
      ativo: true
    };

    const { data, error } = await supabase
      .from('fila_guiches')
      .insert([novoGuiche])
      .select()
      .single();

    if (error) {
      console.error('[guicheServico] Erro ao criar guichê:', error);
      throw new Error(`Falha ao cadastrar guichê: ${error.message}`);
    }

    return data;
  },

  /**
   * Atualiza as informações de um guichê existente.
   * @param {string} id - UUID do guichê.
   * @param {Object} dados
   */
  atualizarGuiche: async (id, dados) => {
    if (!id) {
      throw new Error('Identificador do guichê não fornecido.');
    }

    const dadosAtualizacao = {};
    if (dados.numero !== undefined) {
      dadosAtualizacao.numero = String(dados.numero).trim().padStart(2, '0');
    }
    if (dados.nome !== undefined) {
      dadosAtualizacao.nome = String(dados.nome).trim();
    }
    if (dados.descricao !== undefined) {
      dadosAtualizacao.descricao = String(dados.descricao).trim();
    }
    if (dados.ativo !== undefined) {
      dadosAtualizacao.ativo = Boolean(dados.ativo);
    }

    const { data, error } = await supabase
      .from('fila_guiches')
      .update(dadosAtualizacao)
      .eq('id', id)
      .eq('sistema_id', SISTEMA_ID)
      .select()
      .single();

    if (error) {
      console.error('[guicheServico] Erro ao atualizar guichê:', error);
      throw new Error(`Falha ao atualizar guichê: ${error.message}`);
    }

    return data;
  },

  /**
   * Altera o status de ativação do guichê.
   * @param {string} id - UUID do guichê.
   * @param {boolean} ativo - Novo estado de ativação.
   */
  alternarStatusGuiche: async (id, ativo) => {
    if (!id) throw new Error('Identificador do guichê não fornecido.');

    const { data, error } = await supabase
      .from('fila_guiches')
      .update({ ativo: Boolean(ativo) })
      .eq('id', id)
      .eq('sistema_id', SISTEMA_ID)
      .select()
      .single();

    if (error) {
      console.error('[guicheServico] Erro ao alterar status do guichê:', error);
      throw new Error(`Falha ao alterar status do guichê: ${error.message}`);
    }

    return data;
  },

  /**
   * Exclui um guichê do sistema.
   * @param {string} id - UUID do guichê.
   */
  excluirGuiche: async (id) => {
    if (!id) throw new Error('Identificador do guichê não fornecido.');

    const { error } = await supabase
      .from('fila_guiches')
      .delete()
      .eq('id', id)
      .eq('sistema_id', SISTEMA_ID);

    if (error) {
      console.error('[guicheServico] Erro ao excluir guichê:', error);
      throw new Error(`Falha ao excluir guichê: ${error.message}`);
    }

    return true;
  }
};
