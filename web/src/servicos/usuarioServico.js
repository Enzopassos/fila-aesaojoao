import { supabase, SISTEMA_ID, SISTEMA_SLUG, criarClienteIsolado } from './supabaseCliente';

/**
 * Serviço de Gestão de Usuários e Políticas (Core Multi-Sistema)
 * Todas as operações utilizam as RPCs blindadas definidas no PostgreSQL.
 */
export const usuarioServico = {
  /**
   * Lista todos os usuários vinculados a este sistema com seus respectivos cargos.
   * Requer que o chamador seja Admin ativo do sistema.
   */
  listarUsuarios: async (sistemaId = SISTEMA_ID) => {
    const { data, error } = await supabase.rpc('listar_usuarios_sistema', {
      p_sistema_id: sistemaId
    });

    if (error) {
      console.error('[usuarioServico] Erro ao listar usuários:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Consulta o catálogo de políticas (cargos) disponíveis para este sistema.
   */
  obterPoliticasDisponiveis: async (sistemaId = SISTEMA_ID) => {
    const { data, error } = await supabase
      .from('core_politicas')
      .select('id, nome, descricao, permissoes')
      .eq('sistema_id', sistemaId)
      .order('nome', { ascending: true });

    if (error) {
      console.error('[usuarioServico] Erro ao buscar políticas disponíveis:', error);
      throw error;
    }

    return data || [];
  },

  /**
   * Atribui uma política (cargo) a um usuário no sistema.
   */
  adicionarPolitica: async (usuarioSistemaId, politicaId, sistemaId = SISTEMA_ID) => {
    const { error } = await supabase.rpc('alterar_politica_usuario', {
      p_sistema_id: sistemaId,
      p_usuario_sistema_id: usuarioSistemaId,
      p_politica_id: politicaId,
      p_acao: 'ADICIONAR'
    });

    if (error) {
      console.error('[usuarioServico] Erro ao atribuir política:', error);
      throw error;
    }

    return true;
  },

  /**
   * Remove uma política (cargo) de um usuário no sistema.
   * Possui trava no banco que impede auto-revogação de admin.
   */
  removerPolitica: async (usuarioSistemaId, politicaId, sistemaId = SISTEMA_ID) => {
    const { error } = await supabase.rpc('alterar_politica_usuario', {
      p_sistema_id: sistemaId,
      p_usuario_sistema_id: usuarioSistemaId,
      p_politica_id: politicaId,
      p_acao: 'REMOVER'
    });

    if (error) {
      console.error('[usuarioServico] Erro ao remover política:', error);
      throw error;
    }

    return true;
  },

  /**
   * Ativa ou suspende o acesso de um usuário neste sistema.
   * Possui trava no banco que impede o admin de auto-suspensão.
   */
  alterarStatusUsuario: async (usuarioSistemaId, ativo, sistemaId = SISTEMA_ID) => {
    const { error } = await supabase.rpc('alterar_status_usuario_sistema', {
      p_sistema_id: sistemaId,
      p_usuario_sistema_id: usuarioSistemaId,
      p_ativo: ativo
    });

    if (error) {
      console.error('[usuarioServico] Erro ao alterar status do usuário:', error);
      throw error;
    }

    return true;
  },

  /**
   * Atualiza o nome completo de um colaborador através da RPC blindada.
   * Requer que o chamador seja Admin ativo do sistema.
   */
  atualizarNomeColaborador: async (usuarioId, novoNome, sistemaId = SISTEMA_ID) => {
    const nomeLimpo = novoNome?.trim();
    if (!nomeLimpo) {
      throw new Error('O nome do colaborador não pode ficar em branco.');
    }

    const { error } = await supabase.rpc('atualizar_nome_colaborador', {
      p_sistema_id: sistemaId,
      p_usuario_id: usuarioId,
      p_nome_completo: nomeLimpo
    });

    if (error) {
      console.error('[usuarioServico] Erro ao atualizar nome do colaborador:', error);
      throw error;
    }

    return true;
  },

  /**
   * Cria um novo colaborador utilizando uma instância isolada do Supabase (sem deslogar o admin).
   * Se o usuário já existir no Core unificado, vincula-o diretamente a este sistema.
   * Atribui o cargo inicial selecionado.
   */
  criarColaborador: async ({ nome, email, senha, politicaId, sistemaId = SISTEMA_ID, sistemaSlug = SISTEMA_SLUG }) => {
    const nomeLimpo = nome?.trim();
    const emailLimpo = email?.trim().toLowerCase();

    if (!nomeLimpo) {
      throw new Error('Informe o nome completo do colaborador.');
    }
    if (!emailLimpo) {
      throw new Error('Informe um e-mail corporativo válido.');
    }
    if (!senha || senha.length < 6) {
      throw new Error('A senha provisória deve possuir no mínimo 6 caracteres.');
    }

    const clienteIsolado = criarClienteIsolado();

    let usuarioSistemaId = null;
    let usuarioId = null;

    // 1. Tenta criar usuário no Auth
    const { data: dadosSignUp, error: erroSignUp } = await clienteIsolado.auth.signUp({
      email: emailLimpo,
      password: senha,
      options: {
        data: {
          nome_completo: nomeLimpo,
          sistema_slug: sistemaSlug
        }
      }
    });

    if (erroSignUp) {
      const msg = erroSignUp.message.toLowerCase();
      if (msg.includes('user already registered') || msg.includes('already exists')) {
        // Usuário já cadastrado globalmente no Supabase: vincula ao sistema e atualiza nome
        const { data: dadosVinculo, error: erroVinculo } = await supabase.rpc('vincular_colaborador_por_email', {
          p_sistema_id: sistemaId,
          p_email: emailLimpo,
          p_nome_completo: nomeLimpo
        });

        if (erroVinculo) {
          throw new Error(`Falha ao vincular usuário existente: ${erroVinculo.message}`);
        }

        if (dadosVinculo && dadosVinculo.length > 0) {
          usuarioId = dadosVinculo[0].usuario_id;
          usuarioSistemaId = dadosVinculo[0].usuario_sistema_id;
        }
      } else {
        throw erroSignUp;
      }
    } else {
      usuarioId = dadosSignUp.user?.id;

      // Localiza o id do vínculo gerado pela trigger automática
      if (usuarioId) {
        const { data: vinculo } = await supabase
          .from('core_usuario_sistemas')
          .select('id')
          .eq('sistema_id', sistemaId)
          .eq('usuario_id', usuarioId)
          .maybeSingle();

        usuarioSistemaId = vinculo?.id;
      }
    }

    // 2. Se informado, atribui o cargo inicial via sessão do admin
    if (politicaId && usuarioSistemaId) {
      try {
        await usuarioServico.adicionarPolitica(usuarioSistemaId, politicaId, sistemaId);
      } catch (errCargo) {
        console.warn('[usuarioServico] Aviso ao atribuir cargo inicial:', errCargo);
      }
    }

    return { usuarioId, usuarioSistemaId };
  },

  /**
   * Altera a senha do próprio usuário autenticado com validação prévia da senha atual.
   */
  alterarSenhaPropria: async (email, senhaAtual, novaSenha) => {
    if (!email) {
      throw new Error('Identificação do usuário não encontrada.');
    }
    if (!senhaAtual) {
      throw new Error('Informe sua senha atual.');
    }
    if (!novaSenha || novaSenha.length < 6) {
      throw new Error('A nova senha deve possuir no mínimo 6 caracteres.');
    }
    if (senhaAtual === novaSenha) {
      throw new Error('A nova senha deve ser diferente da senha atual.');
    }

    // 1. Reautentica para validar se a senha atual está correta
    const { error: erroValidacao } = await supabase.auth.signInWithPassword({
      email,
      password: senhaAtual
    });

    if (erroValidacao) {
      throw new Error('A senha atual informada está incorreta.');
    }

    // 2. Atualiza a senha no Supabase Auth
    const { data, error: erroAtualizacao } = await supabase.auth.updateUser({
      password: novaSenha
    });

    if (erroAtualizacao) {
      console.error('[usuarioServico] Erro ao atualizar senha:', erroAtualizacao);
      throw new Error(erroAtualizacao.message || 'Falha ao atualizar senha.');
    }

    return data;
  },

  /**
   * Altera a senha do usuário atualmente autenticado.
   */
  alterarMinhaSenha: async (novaSenha) => {
    if (!novaSenha || novaSenha.length < 6) {
      throw new Error('A nova senha deve possuir pelo menos 6 caracteres.');
    }

    const { data, error } = await supabase.auth.updateUser({
      password: novaSenha
    });

    if (error) {
      console.error('[usuarioServico] Erro ao alterar senha:', error);
      throw error;
    }

    return data;
  }
};
