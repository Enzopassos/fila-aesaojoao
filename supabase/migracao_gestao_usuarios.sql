-- ==============================================================================
-- 🏛️ CORE MULTI-SISTEMA - GESTÃO DE COLABORADORES PELO ADMINISTRADOR
-- Sistema: Fila Auto Escola e Despachante São João
-- Descrição: RPCs para atualização de nome e vínculo de colaboradores existentes
-- ==============================================================================

-- 1. RPC: Atualizar Nome do Colaborador
-- Permite que um administrador altere o nome_completo do perfil espelho e metadados
CREATE OR REPLACE FUNCTION public.atualizar_nome_colaborador(
    p_sistema_id UUID,
    p_usuario_id UUID,
    p_nome_completo TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_nome_limpo TEXT;
BEGIN
    -- 1. Validação de autorização: apenas administradores ativos deste sistema
    IF NOT public.eh_admin_do_sistema(p_sistema_id) THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar o nome de usuários.';
    END IF;

    v_nome_limpo := TRIM(COALESCE(p_nome_completo, ''));
    IF v_nome_limpo = '' THEN
        RAISE EXCEPTION 'O nome do colaborador não pode ficar em branco.';
    END IF;

    -- 2. Atualiza o perfil espelho no core_perfis
    UPDATE public.core_perfis
    SET nome_completo = v_nome_limpo,
        atualizado_em = now()
    WHERE id = p_usuario_id;

    -- 3. Atualiza os metadados do usuário no auth.users (para sincronização perfeita)
    UPDATE auth.users
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
        'nome_completo', v_nome_limpo,
        'full_name', v_nome_limpo
    )
    WHERE id = p_usuario_id;
END;
$$;

-- 2. RPC: Vincular Colaborador por E-mail (caso já exista no Auth global)
CREATE OR REPLACE FUNCTION public.vincular_colaborador_por_email(
    p_sistema_id UUID,
    p_email TEXT,
    p_nome_completo TEXT
)
RETURNS TABLE (
    usuario_id UUID,
    usuario_sistema_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_usuario_id UUID;
    v_usuario_sistema_id UUID;
    v_nome_limpo TEXT;
BEGIN
    -- 1. Validação de autorização
    IF NOT public.eh_admin_do_sistema(p_sistema_id) THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem vincular colaboradores.';
    END IF;

    -- 2. Localiza o usuário em core_perfis pelo e-mail
    SELECT id INTO v_usuario_id 
    FROM public.core_perfis 
    WHERE lower(email) = lower(TRIM(p_email));

    IF v_usuario_id IS NULL THEN
        RAISE EXCEPTION 'Nenhum usuário com o e-mail "%" foi encontrado no sistema.', p_email;
    END IF;

    -- 3. Atualiza nome completo se fornecido
    v_nome_limpo := TRIM(COALESCE(p_nome_completo, ''));
    IF v_nome_limpo <> '' THEN
        UPDATE public.core_perfis 
        SET nome_completo = v_nome_limpo,
            atualizado_em = now()
        WHERE id = v_usuario_id;

        UPDATE auth.users
        SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
            'nome_completo', v_nome_limpo,
            'full_name', v_nome_limpo
        )
        WHERE id = v_usuario_id;
    END IF;

    -- 4. Garante o vínculo no sistema
    INSERT INTO public.core_usuario_sistemas (usuario_id, sistema_id, ativo)
    VALUES (v_usuario_id, p_sistema_id, true)
    ON CONFLICT (usuario_id, sistema_id) DO UPDATE 
        SET ativo = true
    RETURNING id INTO v_usuario_sistema_id;

    RETURN QUERY SELECT v_usuario_id, v_usuario_sistema_id;
END;
$$;

-- 3. Permissões de Execução (Restritas a usuários autenticados, revogadas de anônimos)
REVOKE ALL ON FUNCTION public.atualizar_nome_colaborador(UUID, UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.vincular_colaborador_por_email(UUID, TEXT, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.atualizar_nome_colaborador(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vincular_colaborador_por_email(UUID, TEXT, TEXT) TO authenticated;
