# 🏛️ Documentação Oficial: Arquitetura Core Multi-Sistema (Supabase)

Este documento é o **Manual de Arquitetura e Guia de Implementação do Core Multi-Sistema**. Ele deve ser mantido na raiz dos projetos e consultado por desenvolvedores e IAs sempre que um novo sistema for provisionado, clonado ou modificado.

---

## 1. Visão Geral da Arquitetura

Todos os sistemas da plataforma operam dentro de um **mesmo projeto Supabase (PostgreSQL)**, compartilhando a mesma instância de autenticação global (`auth.users`), mas mantendo **isolamento estrito de membros, cargos, regras de acesso e dados de negócio** através de uma camada central chamada **Core**.

### Princípios Fundamentais:

1. **Identidade Global, Vínculo Local:** Um e-mail existe uma única vez no `auth.users` do Supabase, mas o usuário só tem acesso a um sistema se possuir um registro ativo em `core_usuario_sistemas` para o respectivo `sistema_id`.
2. **Desacoplamento entre Cliente e Staff:**
   - **Cliente Público:** Possui registro em `core_usuario_sistemas`, mas **NÃO** possui registros em `core_usuario_politicas`.
   - **Staff / Equipe Interna:** Possui registro em `core_usuario_sistemas` **E** um ou mais cargos atribuídos em `core_usuario_politicas`.
3. **Integridade Matemática entre Sistemas:** A tabela `core_usuario_politicas` utiliza **Chaves Estrangeiras Compostas (`sistema_id`)**, tornando estruturalmente impossível no nível do PostgreSQL atribuir uma política do Sistema A para um vínculo de usuário do Sistema B.
4. **Proibição de Acesso Direto ao `auth.users`:** A API REST do Supabase bloqueia `JOIN` com o schema `auth`. Toda leitura de dados básicos de usuários (nome, e-mail) deve ser feita na tabela espelho `public.core_perfis` (sincronizada automaticamente via Trigger).

---

## 2. Mapa da Estrutura de Banco de Dados (O Core)

### Tabelas Centrais (`schema public`)

* **`core_sistemas`**: Catálogo de sistemas (`id`, `slug`, `nome`, `tipo`, `ativo`, `criado_em`).
* **`core_perfis`**: Espelho seguro do `auth.users` (`id`, `email`, `nome_completo`, `criado_em`, `atualizado_em`).
* **`core_politicas`**: Cargos/políticas de cada sistema (`id`, `sistema_id`, `nome`, `descricao`, `permissoes JSONB`, `criado_em`).
* **`core_usuario_sistemas`**: Vínculo de pertencimento do usuário ao sistema (`id`, `usuario_id`, `sistema_id`, `ativo`, `criado_em`).
* **`core_usuario_politicas`**: Atribuição de cargos ao vínculo do usuário (`id`, `usuario_sistema_id`, `politica_id`, `sistema_id`, `criado_em`).

### Funções RPC e Triggers Disponíveis no Banco

Todas as tabelas do Core possuem **RLS ativado** permitindo apenas leitura (`SELECT`) dos próprios dados pelo usuário logado. Operações administrativas e vínculos devem **obrigatoriamente** usar as seguintes RPCs (`SECURITY DEFINER`):

| Função / Trigger | Parâmetros | O que faz | Quem pode chamar |
| :--- | :--- | :--- | :--- |
| **`tr_sincronizar_usuario_perfil`** *(Trigger)* | Automático no `auth.users` | Cria/atualiza `core_perfis`. Se `raw_user_meta_data` contiver `sistema_slug`, já vincula o usuário como cliente em `core_usuario_sistemas`. | Automático no `signUp` / `updateUser` |
| **`garantir_vinculo_cliente`** *(RPC)* | `(p_sistema_slug TEXT)` | Cria o vínculo em `core_usuario_sistemas` para usuários que já tinham conta em outro sistema e estão fazendo login no sistema atual pela 1ª vez. | Qualquer usuário autenticado (`authenticated`) |
| **`eh_super_admin`** *(Função SQL)* | *(Nenhum)* | Retorna `true` se o usuário logado for Super Admin ativo no sistema `core-master`. | Uso interno e verificação global |
| **`eh_admin_do_sistema`** *(Função SQL)* | `(p_sistema_id UUID)` | Retorna `true` se o usuário logado for Super Admin OU Admin ativo daquele sistema (`admin`/`administrador` ou flag `gerenciar_usuarios: true`). | Uso interno nas RPCs e nas políticas de RLS das tabelas de negócio |
| **`tem_politica_no_sistema`** *(Função SQL)* | `(p_sistema_id UUID, p_politicas_permitidas TEXT[])` | Função coringa: retorna `true` se o usuário logado for Super Admin OU possuir qualquer uma das políticas listadas no array (ex: `ARRAY['admin', 'atendente']`). | Políticas de RLS em tabelas com múltiplos cargos |
| **`listar_usuarios_sistema`** *(RPC)* | `(p_sistema_id UUID)` | Retorna todos os clientes e staff do sistema agrupando as políticas de cada usuário em um array JSON (`politicas`). | Apenas Admins ativos do sistema |
| **`alterar_politica_usuario`** *(RPC)* | `(p_sistema_id, p_usuario_sistema_id, p_politica_id, p_acao)` | Promove (`'ADICIONAR'`) ou rebaixa (`'REMOVER'`) cargos de um usuário. Possui trava *anti-lockout* que impede o Admin de remover o próprio acesso. | Apenas Admins ativos do sistema |
| **`alterar_status_usuario_sistema`** *(RPC)* | `(p_sistema_id, p_usuario_sistema_id, p_ativo)` | Ativa (`true`) ou suspende/bane (`false`) um usuário dentro daquele sistema específico. Impede auto-bloqueio do Admin. | Apenas Admins ativos do sistema |
| **`provisionar_novo_sistema`** *(RPC)* | `(p_nome, p_slug, p_tipo, p_email_admin_inicial, p_politicas)` | Cria o sistema, cadastra todas as políticas e vincula o 1º Admin em uma única transação, retornando o snippet do `.env`. | Apenas o Super Admin (`core-master`) |

### Sistemas Cadastrados Atualmente (Produção / Banco Compartilhado)

1. **Gestão Global / Super Admin:**
   - **Nome:** Painel Master / Gestão Global
   - **Slug:** `core-master`
   - **ID:** `5186e127-c7d2-401f-b4c8-91137c0d0e25`
   - **Super Admin:** `enzopassos04@gmail.com`
2. **Gabriela Estética:**
   - **Nome:** Gabriela Estética
   - **Slug:** `agendamento-gabriela`
   - **ID:** `661d4b06-976f-448f-9923-9d6b2a596414`
   - **Admin:** `gabrielaspassos@gmail.com`

---

## 3. Passo a Passo: O Que Fazer ao Criar um Sistema Novo

Sempre que um novo projeto for iniciado, siga estritamente este checklist de 4 etapas:

### Etapa 1: Provisionar o Sistema no Core

Execute o bloco de **Seed SQL** no SQL Editor do Supabase (ou painel master):
- Informe `slug` único (ex: `'barbearia-vintage'`), `nome` e `tipo`.
- Defina as políticas do sistema (ex: `'admin'`, `'atendente'`).
- Vincule o e-mail do primeiro administrador.

Copie as variáveis e adicione no arquivo `.env` do novo projeto:
```env
VITE_SUPABASE_URL="https://sua-url.supabase.co"
VITE_SUPABASE_ANON_KEY="sua-anon-key"
VITE_SISTEMA_ID="uuid-do-sistema"
VITE_SISTEMA_SLUG="barbearia-vintage"
```

### Etapa 2: Configurar Redirecionamento no Supabase

1. No painel do Supabase, acesse **Authentication ➔ URL Configuration ➔ Redirect URLs**.
2. Adicione a URL local e de produção do novo sistema (ex: `https://barbearia.com.br/**`) para que links de confirmação e redefinição de senha funcionem no domínio correto.

### Etapa 3: Criar as Tabelas de Negócio do Novo Sistema

1. **Nomenclatura e Isolamento:**
   - Se a tabela for exclusiva deste sistema, use um prefixo claro (ex: `barb_cortes`) ou um Schema PostgreSQL dedicado.
   - Se a tabela for compartilhada entre vários sistemas do mesmo nicho (SaaS Multi-tenant), adicione **obrigatoriamente** a coluna:
     ```sql
     sistema_id UUID NOT NULL REFERENCES public.core_sistemas(id) ON DELETE CASCADE
     ```
2. **Ativar RLS em todas as tabelas novas:**
   - Nunca deixe uma tabela sem `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`.
   - Utilize a função `public.eh_admin_do_sistema(sistema_id)` nas políticas de escrita (`INSERT/UPDATE/DELETE`).

### Etapa 4: Implementar os Fluxos no Front-end (React / Vite)

#### A. Fluxo de Auto-Cadastro de Clientes (`signUp`)
Todo formulário público deve enviar o `sistema_slug` nos metadados para acionar o vínculo automático:
```javascript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      nome_completo: nome,
      sistema_slug: import.meta.env.VITE_SISTEMA_SLUG
    }
  }
});
```

#### B. Fluxo de Login e Carregamento de Permissões (`signIn`)
Ao autenticar ou restaurar a sessão no `AuthContext`:
```javascript
// 1. Garante que o usuário tem vínculo com ESTE sistema
await supabase.rpc('garantir_vinculo_cliente', {
  p_sistema_slug: import.meta.env.VITE_SISTEMA_SLUG
});

// 2. Busca o status do vínculo e as políticas para este sistema
const { data: vinculo, error } = await supabase
  .from('core_usuario_sistemas')
  .select(`
    id,
    ativo,
    core_usuario_politicas (
      core_politicas ( id, nome, permissoes )
    )
  `)
  .eq('sistema_id', import.meta.env.VITE_SISTEMA_ID)
  .eq('usuario_id', session.user.id)
  .single();

// 3. Regras de Bloqueio e Roteamento:
// - Se !vinculo.ativo -> Fazer signOut ou exibir tela de suspensão.
// - Se politicas.length === 0 -> Usuário é CLIENTE (redirecionar para área pública).
// - Se politicas.length > 0 -> Usuário é STAFF (liberar painel de gestão).
```

#### C. Tela de Gestão de Usuários (Painel Admin)
Nunca faça alterações diretas via `INSERT/UPDATE/DELETE` nas tabelas `core_***`. Use sempre as RPCs seguras:
- **Listar:** `supabase.rpc('listar_usuarios_sistema', { p_sistema_id })`
- **Alterar Cargo:** `supabase.rpc('alterar_politica_usuario', { p_sistema_id, p_usuario_sistema_id, p_politica_id, p_acao })`
- **Suspender/Reativar:** `supabase.rpc('alterar_status_usuario_sistema', { p_sistema_id, p_usuario_sistema_id, p_ativo })`

---

## 4. Regras de Ouro para Desenvolvedores e IAs de Código

> **⚠️ INSTRUÇÕES OBRIGATÓRIAS:** Toda alteração de código, componente React, query SQL ou rota de API deve respeitar estritamente estas 6 diretrizes:

1. **PROIBIDO dar `JOIN` ou `SELECT` em `auth.users` pelo Front-end:**
   - **Incorreto:** `.from('auth.users')` ou `JOIN auth.users`.
   - **Correto:** Usar sempre `public.core_perfis` referenciando `usuario_id`.
2. **SEMPRE filtrar pelo `VITE_SISTEMA_ID` atual:**
   - Um usuário pode ser `'admin'` na Barbearia e apenas `'cliente'` na Estética. Nunca busque vínculos ou permissões sem filtrar por `.eq('sistema_id', import.meta.env.VITE_SISTEMA_ID)`.
3. **TRATAR o erro `"User already registered"` com UX inteligente:**
   - Se o cliente já existir em outro sistema com o mesmo e-mail, instrua: *"Você já possui uma conta em nossa plataforma! Faça login para liberar seu acesso neste sistema."*
4. **NUNCA confiar apenas em ocultar botões no Front-end:**
   - Ocultar botões no menu é apenas conveniência visual. Toda rota privada (`RotaProtegida.jsx`) e toda tabela de negócio (RLS) devem validar as políticas no banco de dados.
5. **EVITAR Múltiplas Queries de Permissão a cada Clique:**
   - Carregue políticas e permissões no momento do login/sessão e mantenha no `AuthContext` ou estado global.
6. **CUIDADO com RLS nas Tabelas de Negócio:**
   - Para operações de escrita em tabelas de negócio, use `public.eh_admin_do_sistema(sistema_id)` para garantir checagem rápida sem lentidão de joins repetitivos.

---

## 5. DDL de Referência do Core (Script SQL Completo)

```sql
-- 1. TABELA DE SISTEMAS
CREATE TABLE IF NOT EXISTS public.core_sistemas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TABELA DE PERFIS PÚBLICOS
CREATE TABLE IF NOT EXISTS public.core_perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    nome_completo TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backfill de usuários pré-existentes
INSERT INTO public.core_perfis (id, email, nome_completo)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'nome_completo', raw_user_meta_data->>'full_name', '')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 3. TABELA DE POLÍTICAS
CREATE TABLE IF NOT EXISTS public.core_politicas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sistema_id UUID NOT NULL REFERENCES public.core_sistemas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    permissoes JSONB NOT NULL DEFAULT '{}'::jsonb,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unq_politica_sistema UNIQUE (sistema_id, nome),
    CONSTRAINT unq_politica_id_sistema UNIQUE (id, sistema_id)
);

-- 4. TABELA DE VÍNCULO DO USUÁRIO AO SISTEMA
CREATE TABLE IF NOT EXISTS public.core_usuario_sistemas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES public.core_perfis(id) ON DELETE CASCADE,
    sistema_id UUID NOT NULL REFERENCES public.core_sistemas(id) ON DELETE CASCADE,
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unq_usuario_por_sistema UNIQUE (usuario_id, sistema_id),
    CONSTRAINT unq_usuario_sistema_id_sistema UNIQUE (id, sistema_id)
);

-- 5. TABELA DE POLÍTICAS ATRIBUÍDAS (Com FK Composta)
CREATE TABLE IF NOT EXISTS public.core_usuario_politicas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_sistema_id UUID NOT NULL,
    politica_id UUID NOT NULL,
    sistema_id UUID NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unq_usuario_politica UNIQUE (usuario_sistema_id, politica_id),
    CONSTRAINT fk_usuario_sistema_composto 
        FOREIGN KEY (usuario_sistema_id, sistema_id) 
        REFERENCES public.core_usuario_sistemas (id, sistema_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_politica_sistema_composto 
        FOREIGN KEY (politica_id, sistema_id) 
        REFERENCES public.core_politicas (id, sistema_id) 
        ON DELETE CASCADE
);

-- 6. ÍNDICES DE ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_usuario_sistemas_busca ON public.core_usuario_sistemas (sistema_id, usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_politicas_busca ON public.core_usuario_politicas (sistema_id, usuario_sistema_id);
CREATE INDEX IF NOT EXISTS idx_usuario_politicas_fk_politica ON public.core_usuario_politicas (politica_id, sistema_id);

-- 7. TRIGGER: Sincroniza Perfil + Auto-vincula Cliente no signUp
CREATE OR REPLACE FUNCTION public.sincronizar_novo_usuario_perfil()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sistema_id UUID;
    v_sistema_slug TEXT;
BEGIN
    INSERT INTO public.core_perfis (id, email, nome_completo, atualizado_em)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nome_completo', NEW.raw_user_meta_data->>'full_name', ''),
        now()
    )
    ON CONFLICT (id) DO UPDATE 
    SET email = EXCLUDED.email,
        nome_completo = COALESCE(NULLIF(EXCLUDED.nome_completo, ''), public.core_perfis.nome_completo),
        atualizado_em = now();

    v_sistema_slug := NEW.raw_user_meta_data->>'sistema_slug';
    IF v_sistema_slug IS NOT NULL THEN
        SELECT id INTO v_sistema_id FROM public.core_sistemas WHERE slug = v_sistema_slug AND ativo = true;
        IF v_sistema_id IS NOT NULL THEN
            INSERT INTO public.core_usuario_sistemas (usuario_id, sistema_id)
            VALUES (NEW.id, v_sistema_id)
            ON CONFLICT (usuario_id, sistema_id) DO NOTHING;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_sincronizar_usuario_perfil ON auth.users;
CREATE TRIGGER tr_sincronizar_usuario_perfil
AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sincronizar_novo_usuario_perfil();

-- 8. ATIVAÇÃO DO RLS
ALTER TABLE public.core_sistemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_politicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_usuario_sistemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_usuario_politicas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário lê o próprio perfil" ON public.core_perfis;
CREATE POLICY "Usuário lê o próprio perfil" ON public.core_perfis
    FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuário lê seus próprios vínculos" ON public.core_usuario_sistemas;
CREATE POLICY "Usuário lê seus próprios vínculos" ON public.core_usuario_sistemas
    FOR SELECT TO authenticated USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Usuário lê suas próprias políticas" ON public.core_usuario_politicas;
CREATE POLICY "Usuário lê suas próprias políticas" ON public.core_usuario_politicas
    FOR SELECT TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.core_usuario_sistemas us
            WHERE us.id = core_usuario_politicas.usuario_sistema_id
              AND us.usuario_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Qualquer autenticado lê sistemas ativos" ON public.core_sistemas;
CREATE POLICY "Qualquer autenticado lê sistemas ativos" ON public.core_sistemas
    FOR SELECT TO authenticated USING (ativo = true);

DROP POLICY IF EXISTS "Qualquer autenticado lê catálogo de políticas" ON public.core_politicas;
CREATE POLICY "Qualquer autenticado lê catálogo de políticas" ON public.core_politicas
    FOR SELECT TO authenticated USING (true);

-- 9. FUNÇÕES RPC BLINDADAS
CREATE OR REPLACE FUNCTION public.eh_admin_do_sistema(p_sistema_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.core_usuario_politicas up
        JOIN public.core_usuario_sistemas us ON us.id = up.usuario_sistema_id
        JOIN public.core_politicas p ON p.id = up.politica_id
        WHERE us.usuario_id = auth.uid() 
          AND us.sistema_id = p_sistema_id
          AND us.ativo = true
          AND (
              lower(p.nome) IN ('admin', 'administrador')
              OR (p.permissoes->>'gerenciar_usuarios')::boolean = true
          )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.listar_usuarios_sistema(p_sistema_id UUID)
RETURNS TABLE (
    usuario_id UUID,
    email TEXT,
    nome_completo TEXT,
    usuario_sistema_id UUID,
    ativo BOOLEAN,
    criado_em TIMESTAMPTZ,
    politicas JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.eh_admin_do_sistema(p_sistema_id) THEN
        RAISE EXCEPTION 'Acesso negado: você não tem permissão para gerenciar usuários neste sistema.';
    END IF;

    RETURN QUERY
    SELECT 
        pf.id AS usuario_id,
        pf.email,
        pf.nome_completo,
        us.id AS usuario_sistema_id,
        us.ativo,
        us.criado_em,
        COALESCE(
            jsonb_agg(
                jsonb_build_object('id', p.id, 'nome', p.nome)
            ) FILTER (WHERE p.id IS NOT NULL), 
            '[]'::jsonb
        ) AS politicas
    FROM public.core_usuario_sistemas us
    JOIN public.core_perfis pf ON pf.id = us.usuario_id
    LEFT JOIN public.core_usuario_politicas up ON up.usuario_sistema_id = us.id
    LEFT JOIN public.core_politicas p ON p.id = up.politica_id
    WHERE us.sistema_id = p_sistema_id
    GROUP BY pf.id, pf.email, pf.nome_completo, us.id, us.ativo, us.criado_em
    ORDER BY pf.nome_completo ASC, pf.email ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.alterar_politica_usuario(
    p_sistema_id UUID,
    p_usuario_sistema_id UUID,
    p_politica_id UUID,
    p_acao TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.eh_admin_do_sistema(p_sistema_id) THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar políticas.';
    END IF;

    IF upper(p_acao) = 'ADICIONAR' THEN
        INSERT INTO public.core_usuario_politicas (usuario_sistema_id, politica_id, sistema_id)
        VALUES (p_usuario_sistema_id, p_politica_id, p_sistema_id)
        ON CONFLICT (usuario_sistema_id, politica_id) DO NOTHING;
        
    ELSIF upper(p_acao) = 'REMOVER' THEN
        IF EXISTS (
            SELECT 1 
            FROM public.core_usuario_sistemas us
            JOIN public.core_politicas p ON p.id = p_politica_id
            WHERE us.id = p_usuario_sistema_id 
              AND us.usuario_id = auth.uid()
              AND (lower(p.nome) IN ('admin', 'administrador') OR (p.permissoes->>'gerenciar_usuarios')::boolean = true)
        ) THEN
            RAISE EXCEPTION 'Operação bloqueada: você não pode remover sua própria permissão de administrador.';
        END IF;

        DELETE FROM public.core_usuario_politicas
        WHERE usuario_sistema_id = p_usuario_sistema_id
          AND politica_id = p_politica_id
          AND sistema_id = p_sistema_id;
    ELSE
        RAISE EXCEPTION 'Ação inválida. Use ADICIONAR ou REMOVER.';
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.alterar_status_usuario_sistema(
    p_sistema_id UUID,
    p_usuario_sistema_id UUID,
    p_ativo BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.eh_admin_do_sistema(p_sistema_id) THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar o status de usuários.';
    END IF;

    IF p_ativo = false AND EXISTS (
        SELECT 1 FROM public.core_usuario_sistemas 
        WHERE id = p_usuario_sistema_id AND usuario_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Operação bloqueada: você não pode desativar seu próprio acesso.';
    END IF;

    UPDATE public.core_usuario_sistemas
    SET ativo = p_ativo
    WHERE id = p_usuario_sistema_id
      AND sistema_id = p_sistema_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.garantir_vinculo_cliente(p_sistema_slug TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sistema_id UUID;
    v_vinculo_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    SELECT id INTO v_sistema_id FROM public.core_sistemas WHERE slug = p_sistema_slug AND ativo = true;
    IF v_sistema_id IS NULL THEN
        RAISE EXCEPTION 'Sistema inválido ou inativo.';
    END IF;

    INSERT INTO public.core_usuario_sistemas (usuario_id, sistema_id)
    VALUES (auth.uid(), v_sistema_id)
    ON CONFLICT (usuario_id, sistema_id) DO UPDATE SET usuario_id = EXCLUDED.usuario_id
    RETURNING id INTO v_vinculo_id;

    RETURN v_vinculo_id;
END;
$$;

REVOKE ALL ON FUNCTION public.eh_admin_do_sistema(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.listar_usuarios_sistema(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.alterar_politica_usuario(UUID, UUID, UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.alterar_status_usuario_sistema(UUID, UUID, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.garantir_vinculo_cliente(TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.eh_admin_do_sistema(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_usuarios_sistema(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.alterar_politica_usuario(UUID, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.alterar_status_usuario_sistema(UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.garantir_vinculo_cliente(TEXT) TO authenticated;
```
