-- ==============================================================================
-- 🏛️ ARQUITETURA CORE - PROVISIONAMENTO DO SISTEMA DE FILAS & CONTROLE DE ACESSO
-- Sistema: Fila Auto Escola e Despachante São João
-- Slug: fila-aesaojoao
-- Administrador Inicial: enzopassos04@gmail.com
-- ==============================================================================

-- 1. FUNÇÃO AUXILIAR GLOBAL: tem_politica_no_sistema
-- Verifica se o usuário atual tem alguma das políticas especificadas ou é admin/super_admin
CREATE OR REPLACE FUNCTION public.tem_politica_no_sistema(p_sistema_id UUID, p_politicas_permitidas TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
    IF public.eh_super_admin() THEN
        RETURN true;
    END IF;

    RETURN EXISTS (
        SELECT 1 
        FROM public.core_usuario_politicas up
        JOIN public.core_usuario_sistemas us ON us.id = up.usuario_sistema_id
        JOIN public.core_politicas p ON p.id = up.politica_id
        WHERE us.usuario_id = auth.uid() 
          AND us.sistema_id = p_sistema_id
          AND us.ativo = true
          AND (
              lower(p.nome) = ANY(ARRAY(SELECT lower(unnest(p_politicas_permitidas))))
              OR lower(p.nome) IN ('admin', 'administrador')
              OR (p.permissoes->>'gerenciar_usuarios')::boolean = true
          )
    );
END;
$$;

REVOKE ALL ON FUNCTION public.tem_politica_no_sistema(UUID, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tem_politica_no_sistema(UUID, TEXT[]) TO authenticated;

-- ==============================================================================
-- 2. BLOCO DE PROVISIONAMENTO (SISTEMA, POLÍTICAS E VÍNCULO DO ADMIN)
-- ==============================================================================
DO $$
DECLARE
    v_sistema_id UUID;
    v_politica_admin_id UUID;
    v_politica_atendente_id UUID;
    v_usuario_admin_id UUID;
    v_vinculo_admin_id UUID;
BEGIN
    -- A. Criar ou obter o Sistema no Core
    INSERT INTO public.core_sistemas (slug, nome, tipo, ativo)
    VALUES (
        'fila-aesaojoao',
        'Fila Auto Escola São João',
        'atendimento_filas',
        true
    )
    ON CONFLICT (slug) DO UPDATE 
        SET nome = EXCLUDED.nome,
            tipo = EXCLUDED.tipo,
            ativo = true
    RETURNING id INTO v_sistema_id;

    -- B. Cadastrar Política: admin (Gestão total)
    INSERT INTO public.core_politicas (sistema_id, nome, descricao, permissoes)
    VALUES (
        v_sistema_id,
        'admin',
        'Administrador - Gestão total de usuários, guichês, categorias e relatórios',
        jsonb_build_object(
            'gerenciar_usuarios', true,
            'gerenciar_guiches', true,
            'gerenciar_categorias', true,
            'atender_senhas', true
        )
    )
    ON CONFLICT (sistema_id, nome) DO UPDATE 
        SET descricao = EXCLUDED.descricao,
            permissoes = EXCLUDED.permissoes
    RETURNING id INTO v_politica_admin_id;

    -- C. Cadastrar Política: atendente (Operação de atendimento apenas)
    INSERT INTO public.core_politicas (sistema_id, nome, descricao, permissoes)
    VALUES (
        v_sistema_id,
        'atendente',
        'Atendente de Guichê - Chamar, iniciar e concluir atendimentos',
        jsonb_build_object(
            'gerenciar_usuarios', false,
            'gerenciar_guiches', false,
            'gerenciar_categorias', false,
            'atender_senhas', true
        )
    )
    ON CONFLICT (sistema_id, nome) DO UPDATE 
        SET descricao = EXCLUDED.descricao,
            permissoes = EXCLUDED.permissoes
    RETURNING id INTO v_politica_atendente_id;

    -- D. Localizar Perfil do Administrador (enzopassos04@gmail.com)
    SELECT id INTO v_usuario_admin_id 
    FROM public.core_perfis 
    WHERE lower(email) = 'enzopassos04@gmail.com';

    IF v_usuario_admin_id IS NULL THEN
        RAISE NOTICE 'Aviso: Usuário enzopassos04@gmail.com ainda não existe em core_perfis. Ele será vinculado como admin assim que fizer o primeiro login.';
    ELSE
        -- Vincular usuário ao sistema
        INSERT INTO public.core_usuario_sistemas (usuario_id, sistema_id, ativo)
        VALUES (v_usuario_admin_id, v_sistema_id, true)
        ON CONFLICT (usuario_id, sistema_id) DO UPDATE 
            SET ativo = true
        RETURNING id INTO v_vinculo_admin_id;

        -- Atribuir política 'admin' ao vínculo
        INSERT INTO public.core_usuario_politicas (usuario_sistema_id, politica_id, sistema_id)
        VALUES (v_vinculo_admin_id, v_politica_admin_id, v_sistema_id)
        ON CONFLICT (usuario_sistema_id, politica_id) DO NOTHING;

        RAISE NOTICE 'Sucesso: Usuário enzopassos04@gmail.com configurado como ADMIN do sistema fila-aesaojoao.';
    END IF;

    RAISE NOTICE 'Sistema Provisionado com ID: %', v_sistema_id;
END;
$$;

-- ==============================================================================
-- 3. TABELAS DE NEGÓCIO DO SISTEMA DE FILAS
-- ==============================================================================

-- A. Tabela de Guichês
CREATE TABLE IF NOT EXISTS public.fila_guiches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sistema_id UUID NOT NULL REFERENCES public.core_sistemas(id) ON DELETE CASCADE,
    numero TEXT NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unq_guiche_sistema_numero UNIQUE (sistema_id, numero)
);

-- B. Tabela de Categorias de Atendimento
CREATE TABLE IF NOT EXISTS public.fila_categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sistema_id UUID NOT NULL REFERENCES public.core_sistemas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    prefixo TEXT NOT NULL,
    prioridade BOOLEAN NOT NULL DEFAULT false,
    cor_badge TEXT DEFAULT '#2563eb',
    cor_fundo TEXT DEFAULT '#dbeafe',
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unq_categoria_sistema_prefixo UNIQUE (sistema_id, prefixo)
);

-- C. Tabela de Senhas
CREATE TABLE IF NOT EXISTS public.fila_senhas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sistema_id UUID NOT NULL REFERENCES public.core_sistemas(id) ON DELETE CASCADE,
    categoria_id UUID NOT NULL REFERENCES public.fila_categorias(id) ON DELETE RESTRICT,
    guiche_id UUID REFERENCES public.fila_guiches(id) ON DELETE SET NULL,
    guiche_numero TEXT,
    atendente_id UUID REFERENCES public.core_perfis(id) ON DELETE SET NULL,
    codigo_formatado TEXT NOT NULL,
    numero_sequencial INT NOT NULL,
    tipo_servico TEXT NOT NULL,
    preferencial BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'chamado', 'em_atendimento', 'concluido', 'ausente', 'cancelado')),
    chamadas_total INT NOT NULL DEFAULT 0,
    gerado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    chamado_em TIMESTAMPTZ,
    iniciado_em TIMESTAMPTZ,
    finalizado_em TIMESTAMPTZ
);

-- Índices de Alta Performance para TV, Totem e Atendimento
CREATE INDEX IF NOT EXISTS idx_fila_guiches_sistema ON public.fila_guiches (sistema_id, ativo);
CREATE INDEX IF NOT EXISTS idx_fila_categorias_sistema ON public.fila_categorias (sistema_id, ativo);
CREATE INDEX IF NOT EXISTS idx_fila_senhas_status ON public.fila_senhas (sistema_id, status, gerado_em);
CREATE INDEX IF NOT EXISTS idx_fila_senhas_tv ON public.fila_senhas (sistema_id, chamado_em DESC);

-- ==============================================================================
-- 4. POLÍTICAS DE RLS (SEGURANÇA POR CARGO E SISTEMA)
-- ==============================================================================

-- Ativação do RLS
ALTER TABLE public.fila_guiches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fila_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fila_senhas ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- REGRAS: fila_guiches
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Leitura de guichês para usuários e tv" ON public.fila_guiches;
CREATE POLICY "Leitura de guichês para usuários e tv" ON public.fila_guiches
    FOR SELECT TO anon, authenticated
    USING (ativo = true);

DROP POLICY IF EXISTS "Apenas admin insere guichês" ON public.fila_guiches;
CREATE POLICY "Apenas admin insere guichês" ON public.fila_guiches
    FOR INSERT TO authenticated
    WITH CHECK (public.eh_admin_do_sistema(sistema_id));

DROP POLICY IF EXISTS "Apenas admin atualiza guichês" ON public.fila_guiches;
CREATE POLICY "Apenas admin atualiza guichês" ON public.fila_guiches
    FOR UPDATE TO authenticated
    USING (public.eh_admin_do_sistema(sistema_id))
    WITH CHECK (public.eh_admin_do_sistema(sistema_id));

DROP POLICY IF EXISTS "Apenas admin remove guichês" ON public.fila_guiches;
CREATE POLICY "Apenas admin remove guichês" ON public.fila_guiches
    FOR DELETE TO authenticated
    USING (public.eh_admin_do_sistema(sistema_id));

-- ------------------------------------------------------------------------------
-- REGRAS: fila_categorias
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Leitura de categorias para usuários, tv e totem" ON public.fila_categorias;
CREATE POLICY "Leitura de categorias para usuários, tv e totem" ON public.fila_categorias
    FOR SELECT TO anon, authenticated
    USING (ativo = true);

DROP POLICY IF EXISTS "Apenas admin insere categorias" ON public.fila_categorias;
CREATE POLICY "Apenas admin insere categorias" ON public.fila_categorias
    FOR INSERT TO authenticated
    WITH CHECK (public.eh_admin_do_sistema(sistema_id));

DROP POLICY IF EXISTS "Apenas admin atualiza categorias" ON public.fila_categorias;
CREATE POLICY "Apenas admin atualiza categorias" ON public.fila_categorias
    FOR UPDATE TO authenticated
    USING (public.eh_admin_do_sistema(sistema_id))
    WITH CHECK (public.eh_admin_do_sistema(sistema_id));

DROP POLICY IF EXISTS "Apenas admin remove categorias" ON public.fila_categorias;
CREATE POLICY "Apenas admin remove categorias" ON public.fila_categorias
    FOR DELETE TO authenticated
    USING (public.eh_admin_do_sistema(sistema_id));

-- ------------------------------------------------------------------------------
-- REGRAS: fila_senhas
-- ------------------------------------------------------------------------------
-- Qualquer pessoa (TV, Totem, Atendentes, Público) pode ler senhas do sistema
DROP POLICY IF EXISTS "Leitura de senhas do sistema" ON public.fila_senhas;
CREATE POLICY "Leitura de senhas do sistema" ON public.fila_senhas
    FOR SELECT TO anon, authenticated
    USING (true);

-- Totem de autoatendimento e usuários autenticados podem gerar nova senha
DROP POLICY IF EXISTS "Emissão de senhas no totem ou sistema" ON public.fila_senhas;
CREATE POLICY "Emissão de senhas no totem ou sistema" ON public.fila_senhas
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- Apenas Staff com política 'admin' ou 'atendente' pode atualizar senhas (chamar, iniciar, finalizar)
DROP POLICY IF EXISTS "Atendentes e admins atualizam senhas" ON public.fila_senhas;
CREATE POLICY "Atendentes e admins atualizam senhas" ON public.fila_senhas
    FOR UPDATE TO authenticated
    USING (public.tem_politica_no_sistema(sistema_id, ARRAY['admin', 'atendente']))
    WITH CHECK (public.tem_politica_no_sistema(sistema_id, ARRAY['admin', 'atendente']));

-- Apenas Administradores podem excluir histórico de senhas
DROP POLICY IF EXISTS "Apenas admin exclui senhas" ON public.fila_senhas;
CREATE POLICY "Apenas admin exclui senhas" ON public.fila_senhas
    FOR DELETE TO authenticated
    USING (public.eh_admin_do_sistema(sistema_id));

-- ==============================================================================
-- 5. SEED INICIAL DE DADOS (GUICHÊS E CATEGORIAS PADRÃO)
-- ==============================================================================
DO $$
DECLARE
    v_sistema_id UUID;
BEGIN
    SELECT id INTO v_sistema_id FROM public.core_sistemas WHERE slug = 'fila-aesaojoao';
    
    IF v_sistema_id IS NOT NULL THEN
        -- Inserir Guichês 01 a 04
        INSERT INTO public.fila_guiches (sistema_id, numero, nome, descricao)
        VALUES 
            (v_sistema_id, '01', 'Guichê 01', 'Atendimento Geral / Prioritário'),
            (v_sistema_id, '02', 'Guichê 02', 'Despachante e Documentos'),
            (v_sistema_id, '03', 'Guichê 03', 'Auto Escola e Matrículas'),
            (v_sistema_id, '04', 'Guichê 04', 'Exames Médicos e Biometria')
        ON CONFLICT (sistema_id, numero) DO NOTHING;

        -- Inserir Categorias Padrão
        INSERT INTO public.fila_categorias (sistema_id, nome, prefixo, prioridade, cor_badge, cor_fundo)
        VALUES 
            (v_sistema_id, 'Prioritário', 'P', true, '#d97706', '#fef3c7'),
            (v_sistema_id, 'Despachante', 'D', false, '#2563eb', '#dbeafe'),
            (v_sistema_id, 'AUTO ESCOLA', 'A', false, '#059669', '#d1fae5'),
            (v_sistema_id, 'Exames / Biometria', 'E', false, '#7c3aed', '#ede9fe')
        ON CONFLICT (sistema_id, prefixo) DO NOTHING;
    END IF;
END;
$$;

-- ==============================================================================
-- 6. REALTIME: TRANSMISSÃO AUTOMÁTICA PARA TV E PAINEL
-- ==============================================================================
DO $$
BEGIN
    -- Adicionar fila_senhas à publicação Realtime se ainda não estiver
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'fila_senhas'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.fila_senhas;
    END IF;
END;
$$;

-- ==============================================================================
-- 7. CONSULTA DO ID DO SISTEMA GERADO (Copie o resultado para o .env)
-- ==============================================================================
SELECT 
    id AS "VITE_SISTEMA_ID",
    slug AS "VITE_SISTEMA_SLUG",
    nome AS "NOME_SISTEMA"
FROM public.core_sistemas 
WHERE slug = 'fila-aesaojoao';
