import { supabase, SISTEMA_ID } from './supabaseCliente';

/**
 * Serviço de Categorias para o Totem React Native
 */
export const categoriaServico = {
  /**
   * Lista as categorias ativas cadastradas para o autoatendimento.
   */
  listarCategorias: async (apenasAtivas = true) => {
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
  }
};

