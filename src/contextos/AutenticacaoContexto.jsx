import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, SISTEMA_ID, SISTEMA_SLUG } from '../servicos/supabaseCliente';

const AutenticacaoContexto = createContext(null);

export function AutenticacaoProvider({ children }) {
  const [sessao, setSessao] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [politicas, setPoliticas] = useState([]);
  const [ehAdmin, setEhAdmin] = useState(false);
  const [vinculoAtivo, setVinculoAtivo] = useState(true);
  const [carregando, setCarregando] = useState(true);

  const carregarPermissoesDoSistema = useCallback(async (userId) => {
    if (!userId) {
      setPoliticas([]);
      setEhAdmin(false);
      setPerfil(null);
      return {
        ehAdmin: false,
        politicas: [],
        vinculoAtivo: false,
        perfil: null
      };
    }

    try {
      // 1. Garante o vínculo do usuário com este sistema específico (Core)
      try {
        await supabase.rpc('garantir_vinculo_cliente', {
          p_sistema_slug: SISTEMA_SLUG
        });
      } catch (errVinculo) {
        console.warn('[Auth] Aviso ao garantir vínculo:', errVinculo?.message);
      }

      // 2. Verifica se é Admin através da RPC blindada
      let isAdmin = false;
      try {
        const { data: adminResult, error: adminError } = await supabase.rpc('eh_admin_do_sistema', {
          p_sistema_id: SISTEMA_ID
        });
        if (!adminError && adminResult) {
          isAdmin = true;
        }
      } catch (errRpc) {
        console.warn('[Auth] Aviso ao checar admin:', errRpc?.message);
      }

      // 3. Busca vínculo, status e políticas ativas
      const { data: dadosVinculo } = await supabase
        .from('core_usuario_sistemas')
        .select(`
          id,
          ativo,
          core_usuario_politicas (
            core_politicas ( id, nome, permissoes )
          )
        `)
        .eq('sistema_id', SISTEMA_ID)
        .eq('usuario_id', userId)
        .maybeSingle();

      const listaPoliticas = [];
      if (dadosVinculo?.core_usuario_politicas) {
        dadosVinculo.core_usuario_politicas.forEach((item) => {
          if (item.core_politicas?.nome) {
            listaPoliticas.push(item.core_politicas.nome.toLowerCase());
          }
        });
      }

      const ehAdminCalculado =
        isAdmin ||
        listaPoliticas.includes('admin') ||
        listaPoliticas.includes('administrador');

      setPoliticas(listaPoliticas);
      setEhAdmin(ehAdminCalculado);
      setVinculoAtivo(dadosVinculo ? dadosVinculo.ativo : true);

      // 4. Busca perfil público espelho
      const { data: dadosPerfil } = await supabase
        .from('core_perfis')
        .select('id, email, nome_completo')
        .eq('id', userId)
        .maybeSingle();

      setPerfil(dadosPerfil);

      return {
        ehAdmin: ehAdminCalculado,
        politicas: listaPoliticas,
        vinculoAtivo: dadosVinculo ? dadosVinculo.ativo : true,
        perfil: dadosPerfil
      };
    } catch (erroGeral) {
      console.error('[Auth] Erro ao carregar permissões:', erroGeral);
      return {
        ehAdmin: false,
        politicas: [],
        vinculoAtivo: false,
        perfil: null
      };
    }
  }, []);

  useEffect(() => {
    let montado = true;

    async function inicializarAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!montado) return;

        setSessao(session);
        setUsuario(session?.user ?? null);

        if (session?.user) {
          await carregarPermissoesDoSistema(session.user.id);
        }
      } catch (err) {
        console.error('[Auth] Erro inicializando sessão:', err);
      } finally {
        if (montado) setCarregando(false);
      }
    }

    inicializarAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_evento, session) => {
      if (!montado) return;
      setSessao(session);
      setUsuario(session?.user ?? null);

      if (session?.user) {
        await carregarPermissoesDoSistema(session.user.id);
      } else {
        setPoliticas([]);
        setEhAdmin(false);
        setPerfil(null);
      }
      if (montado) setCarregando(false);
    });

    return () => {
      montado = false;
      subscription.unsubscribe();
    };
  }, [carregarPermissoesDoSistema]);

  const entrar = useCallback(async (email, senha) => {
    setCarregando(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha
      });
      if (error) throw error;

      setSessao(data.session);
      setUsuario(data.user);

      let resultadoPermissoes = null;
      if (data?.user) {
        resultadoPermissoes = await carregarPermissoesDoSistema(data.user.id);
      }

      return {
        ...data,
        ehAdmin: resultadoPermissoes?.ehAdmin ?? false
      };
    } finally {
      setCarregando(false);
    }
  }, [carregarPermissoesDoSistema]);

  const sair = useCallback(async () => {
    setCarregando(true);
    try {
      await supabase.auth.signOut();
      localStorage.removeItem('guiche_operador');
      setSessao(null);
      setUsuario(null);
      setPerfil(null);
      setPoliticas([]);
      setEhAdmin(false);
    } finally {
      setCarregando(false);
    }
  }, []);

  const temPolitica = useCallback((nomePolitica) => {
    if (ehAdmin) return true;
    return politicas.includes(nomePolitica.toLowerCase());
  }, [ehAdmin, politicas]);

  const recarregarPermissoes = useCallback(async () => {
    if (usuario?.id) {
      setCarregando(true);
      try {
        await carregarPermissoesDoSistema(usuario.id);
      } finally {
        setCarregando(false);
      }
    }
  }, [usuario, carregarPermissoesDoSistema]);

  const valor = {
    sessao,
    usuario,
    perfil,
    politicas,
    ehAdmin,
    vinculoAtivo,
    carregando,
    autenticado: !!usuario,
    entrar,
    sair,
    temPolitica,
    recarregarPermissoes
  };

  return (
    <AutenticacaoContexto.Provider value={valor}>
      {children}
    </AutenticacaoContexto.Provider>
  );
}

export function useAutenticacao() {
  const contexto = useContext(AutenticacaoContexto);
  if (!contexto) {
    throw new Error('useAutenticacao deve ser utilizado dentro de um AutenticacaoProvider');
  }
  return contexto;
}
