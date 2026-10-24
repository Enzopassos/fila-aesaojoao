import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Shield,
  Headphones,
  Search,
  RefreshCw,
  CheckCircle2,
  UserCheck,
  UserX,
  AlertCircle,
  X,
  ShieldCheck,
  User,
  UserPlus,
  Pencil
} from 'lucide-react';
import { usuarioServico } from '../../servicos/usuarioServico';
import { useAutenticacao } from '../../contextos/AutenticacaoContexto';
import { CabecalhoPagina } from '../CabecalhoPagina';
import './GestaoUsuarios.css';

export function GestaoUsuarios() {
  const { usuario: usuarioLogado, recarregarPermissoes } = useAutenticacao();

  const [usuarios, setUsuarios] = useState([]);
  const [politicasDisponiveis, setPoliticasDisponiveis] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState(null);

  // Estados do Modal de Cargos
  const [modalCargosAberto, setModalCargosAberto] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [salvandoCargo, setSalvandoCargo] = useState(false);

  // Estados do Modal de Criação de Colaborador
  const [modalNovoAberto, setModalNovoAberto] = useState(false);
  const [nomeNovo, setNomeNovo] = useState('');
  const [emailNovo, setEmailNovo] = useState('');
  const [senhaNova, setSenhaNova] = useState('');
  const [politicaNovaId, setPoliticaNovaId] = useState('');
  const [salvandoNovo, setSalvandoNovo] = useState(false);
  const [erroNovo, setErroNovo] = useState(null);

  // Estados do Modal de Edição de Nome
  const [modalEditarNomeAberto, setModalEditarNomeAberto] = useState(false);
  const [usuarioParaEditarNome, setUsuarioParaEditarNome] = useState(null);
  const [nomeEditado, setNomeEditado] = useState('');
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [erroEditarNome, setErroEditarNome] = useState(null);

  async function carregarDados() {
    setCarregando(true);
    setErro(null);
    try {
      const [listaUsuarios, listaPoliticas] = await Promise.all([
        usuarioServico.listarUsuarios(),
        usuarioServico.obterPoliticasDisponiveis()
      ]);
      setUsuarios(listaUsuarios);
      setPoliticasDisponiveis(listaPoliticas);
    } catch (err) {
      console.error('[GestaoUsuarios] Falha ao carregar:', err);
      setErro(err?.message || 'Erro ao carregar a lista de usuários do sistema.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();
  }, []);

  const usuariosFiltrados = useMemo(() => {
    if (!busca.trim()) return usuarios;
    const termo = busca.toLowerCase();
    return usuarios.filter(
      (u) =>
        (u.nome_completo && u.nome_completo.toLowerCase().includes(termo)) ||
        (u.email && u.email.toLowerCase().includes(termo))
    );
  }, [usuarios, busca]);

  // =========================================================================
  // GESTÃO DE CARGOS E PERMISSÕES
  // =========================================================================
  function abrirModalCargos(usuario) {
    setUsuarioSelecionado(usuario);
    setModalCargosAberto(true);
  }

  function fecharModalCargos() {
    setModalCargosAberto(false);
    setUsuarioSelecionado(null);
  }

  async function alternarPolitica(politicaId, possuiPolitica) {
    if (!usuarioSelecionado) return;

    // Trava de segurança: impede auto-remoção de admin
    const ehOMesmoUsuario = usuarioSelecionado.usuario_id === usuarioLogado?.id;
    const infoPolitica = politicasDisponiveis.find((p) => p.id === politicaId);
    const ehAdmin = infoPolitica?.nome.toLowerCase() === 'admin' || infoPolitica?.nome.toLowerCase() === 'administrador';

    if (ehOMesmoUsuario && ehAdmin && possuiPolitica) {
      alert('Operação bloqueada: você não pode remover sua própria permissão de administrador.');
      return;
    }

    setSalvandoCargo(true);
    try {
      if (possuiPolitica) {
        await usuarioServico.removerPolitica(
          usuarioSelecionado.usuario_sistema_id,
          politicaId
        );
      } else {
        await usuarioServico.adicionarPolitica(
          usuarioSelecionado.usuario_sistema_id,
          politicaId
        );
      }

      await carregarDados();

      // Atualiza o objeto selecionado no modal
      setUsuarioSelecionado((anterior) => {
        if (!anterior) return null;
        let novasPoliticas = [...(anterior.politicas || [])];
        if (possuiPolitica) {
          novasPoliticas = novasPoliticas.filter((p) => p.id !== politicaId);
        } else {
          novasPoliticas.push({ id: politicaId, nome: infoPolitica?.nome || '' });
        }
        return { ...anterior, politicas: novasPoliticas };
      });

      if (ehOMesmoUsuario) {
        await recarregarPermissoes();
      }

      setMensagemSucesso('Permissão de cargo atualizada com sucesso!');
      setTimeout(() => setMensagemSucesso(null), 3000);
    } catch (err) {
      console.error('[GestaoUsuarios] Erro ao alternar política:', err);
      alert('Erro ao atualizar cargo: ' + (err?.message || 'Falha na comunicação com o banco.'));
    } finally {
      setSalvandoCargo(false);
    }
  }

  // =========================================================================
  // STATUS (ATIVAR / SUSPENDER ACESSO)
  // =========================================================================
  async function alternarStatusUsuario(usuario) {
    const novoStatus = !usuario.ativo;
    const acaoTexto = novoStatus ? 'reativar' : 'suspender';

    if (usuario.usuario_id === usuarioLogado?.id && !novoStatus) {
      alert('Operação bloqueada: você não pode desativar o seu próprio acesso.');
      return;
    }

    const confirmou = window.confirm(
      `Deseja realmente ${acaoTexto} o acesso de ${usuario.nome_completo || usuario.email} neste sistema?`
    );
    if (!confirmou) return;

    try {
      await usuarioServico.alterarStatusUsuario(usuario.usuario_sistema_id, novoStatus);
      await carregarDados();
      setMensagemSucesso(`Acesso do colaborador ${novoStatus ? 'reativado' : 'suspenso'} com sucesso!`);
      setTimeout(() => setMensagemSucesso(null), 3000);
    } catch (err) {
      console.error('[GestaoUsuarios] Erro ao alterar status:', err);
      alert('Erro ao alterar status: ' + (err?.message || 'Falha na operação.'));
    }
  }

  // =========================================================================
  // CADASTRO DE NOVO COLABORADOR
  // =========================================================================
  function abrirModalNovo() {
    setNomeNovo('');
    setEmailNovo('');
    setSenhaNova('');
    const polAtendente = politicasDisponiveis.find((p) => p.nome.toLowerCase() === 'atendente');
    setPoliticaNovaId(polAtendente?.id || politicasDisponiveis[0]?.id || '');
    setErroNovo(null);
    setModalNovoAberto(true);
  }

  function fecharModalNovo() {
    if (salvandoNovo) return;
    setModalNovoAberto(false);
    setErroNovo(null);
  }

  async function tratarSalvarNovoColaborador(e) {
    e.preventDefault();
    setErroNovo(null);

    const nomeLimpo = nomeNovo.trim();
    const emailLimpo = emailNovo.trim();

    if (!nomeLimpo) {
      setErroNovo('Informe o nome completo do colaborador.');
      return;
    }
    if (!emailLimpo) {
      setErroNovo('Informe um e-mail válido.');
      return;
    }
    if (!senhaNova || senhaNova.length < 6) {
      setErroNovo('A senha provisória deve possuir no mínimo 6 caracteres.');
      return;
    }

    setSalvandoNovo(true);
    try {
      await usuarioServico.criarColaborador({
        nome: nomeLimpo,
        email: emailLimpo,
        senha: senhaNova,
        politicaId: politicaNovaId || null
      });

      await carregarDados();
      setModalNovoAberto(false);
      setMensagemSucesso(`Colaborador "${nomeLimpo}" cadastrado com sucesso!`);
      setTimeout(() => setMensagemSucesso(null), 4000);
    } catch (err) {
      console.error('[GestaoUsuarios] Erro ao cadastrar colaborador:', err);
      setErroNovo(err?.message || 'Falha ao cadastrar colaborador no sistema.');
    } finally {
      setSalvandoNovo(false);
    }
  }

  // =========================================================================
  // EDIÇÃO DE NOME DO COLABORADOR
  // =========================================================================
  function abrirModalEditarNome(usuario) {
    setUsuarioParaEditarNome(usuario);
    setNomeEditado(usuario.nome_completo || '');
    setErroEditarNome(null);
    setModalEditarNomeAberto(true);
  }

  function fecharModalEditarNome() {
    if (salvandoNome) return;
    setModalEditarNomeAberto(false);
    setUsuarioParaEditarNome(null);
    setErroEditarNome(null);
  }

  async function tratarSalvarEditarNome(e) {
    e.preventDefault();
    setErroEditarNome(null);

    const nomeLimpo = nomeEditado.trim();
    if (!nomeLimpo) {
      setErroEditarNome('O nome do colaborador não pode ficar em branco.');
      return;
    }

    setSalvandoNome(true);
    try {
      await usuarioServico.atualizarNomeColaborador(
        usuarioParaEditarNome.usuario_id,
        nomeLimpo
      );

      await carregarDados();
      if (usuarioParaEditarNome.usuario_id === usuarioLogado?.id) {
        await recarregarPermissoes();
      }

      setModalEditarNomeAberto(false);
      setMensagemSucesso('Nome do colaborador atualizado com sucesso!');
      setTimeout(() => setMensagemSucesso(null), 3500);
    } catch (err) {
      console.error('[GestaoUsuarios] Erro ao atualizar nome:', err);
      setErroEditarNome(err?.message || 'Erro ao salvar novo nome.');
    } finally {
      setSalvandoNome(false);
    }
  }

  function formatarData(dataIso) {
    if (!dataIso) return '-';
    try {
      const d = new Date(dataIso);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return '-';
    }
  }

  function obterIniciais(nome, email) {
    if (nome && nome.trim()) {
      const partes = nome.trim().split(' ');
      if (partes.length >= 2) {
        return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
      }
      return partes[0].slice(0, 2).toUpperCase();
    }
    return email ? email.slice(0, 2).toUpperCase() : 'US';
  }

  return (
    <div className="gestao-usuarios-container">
      <CabecalhoPagina
        icone={Users}
        titulo={
          <>
            <span>Gestão de Usuários e Cargos</span>
            <span className="badge-total-usuarios">
              {usuarios.length} {usuarios.length === 1 ? 'colaborador' : 'colaboradores'}
            </span>
          </>
        }
        subtitulo="Controle os colaboradores com acesso ao sistema de filas e atribua políticas de Administrador ou Atendente."
        acoes={
          <div className="gestao-usuarios-acoes-topo">
            <button
              type="button"
              className="btn-novo-colaborador"
              onClick={abrirModalNovo}
              title="Cadastrar um novo colaborador no sistema"
            >
              <UserPlus size={16} />
              <span>Novo Colaborador</span>
            </button>
          </div>
        }
      />

      {/* Banner de Feedback Global */}
      {mensagemSucesso && (
        <div className="alerta-sucesso-global" role="status">
          <CheckCircle2 size={18} />
          <span>{mensagemSucesso}</span>
        </div>
      )}

      {/* Barra de Filtro e Busca */}
      <div className="gestao-usuarios-filtros">
        <div className="busca-input-wrapper">
          <Search size={18} className="busca-icone" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="busca-input"
          />
          {busca && (
            <button
              type="button"
              className="btn-limpar-busca"
              onClick={() => setBusca('')}
              title="Limpar busca"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {erro && (
        <div className="alerta-erro-tabela">
          <AlertCircle size={18} />
          <span>{erro}</span>
        </div>
      )}

      {/* Tabela de Usuários */}
      <div className="tabela-card-container">
        {carregando ? (
          <div className="tabela-estado-carregando">
            <RefreshCw size={28} className="icone-girando" />
            <p>Carregando colaboradores e políticas...</p>
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="tabela-estado-vazio">
            <Users size={40} className="icone-vazio" />
            <h3>Nenhum usuário encontrado</h3>
            <p>
              {busca
                ? 'Nenhum resultado corresponde ao termo pesquisado.'
                : 'Nenhum colaborador vinculado a este sistema ainda.'}
            </p>
          </div>
        ) : (
          <table className="tabela-usuarios">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Vínculo no Sistema</th>
                <th>Cargos / Políticas</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((u) => {
                const ehOProprioUsuario = u.usuario_id === usuarioLogado?.id;
                const temPoliticas = u.politicas && u.politicas.length > 0;

                return (
                  <tr key={u.usuario_sistema_id} className={!u.ativo ? 'linha-inativa' : ''}>
                    {/* Colaborador */}
                    <td>
                      <div className="colaborador-perfil-celula">
                        <div className="avatar-iniciais">
                          {obterIniciais(u.nome_completo, u.email)}
                        </div>
                        <div className="dados-nome-email">
                          <div className="nome-box">
                            <span className="nome-colaborador">
                              {u.nome_completo || 'Sem nome informado'}
                            </span>
                            {ehOProprioUsuario && (
                              <span className="badge-voce">Você</span>
                            )}
                          </div>
                          <span className="email-colaborador">{u.email}</span>
                        </div>
                      </div>
                    </td>

                    {/* Vínculo */}
                    <td className="celula-texto-suave">
                      {formatarData(u.criado_em)}
                    </td>

                    {/* Políticas */}
                    <td>
                      <div className="tags-politicas-container">
                        {temPoliticas ? (
                          u.politicas.map((pol) => {
                            const nome = pol.nome.toLowerCase();
                            const isAdmin = nome === 'admin' || nome === 'administrador';
                            const isAtendente = nome === 'atendente';

                            return (
                              <span
                                key={pol.id}
                                className={`tag-politica ${
                                  isAdmin
                                    ? 'tag-admin'
                                    : isAtendente
                                    ? 'tag-atendente'
                                    : 'tag-outra'
                                }`}
                              >
                                {isAdmin ? (
                                  <Shield size={13} />
                                ) : isAtendente ? (
                                  <Headphones size={13} />
                                ) : (
                                  <ShieldCheck size={13} />
                                )}
                                <span>{pol.nome}</span>
                              </span>
                            );
                          })
                        ) : (
                          <span className="tag-sem-cargo tag-sem-cargo-destaque">
                            <AlertCircle size={13} />
                            <span>Sem Cargo (Aguardando Liberação)</span>
                          </span>
                        )}
                      </div>
                    </td>


                    {/* Ações */}
                    <td style={{ textAlign: 'right' }}>
                      <div className="botoes-acoes-celula">
                        <button
                          type="button"
                          className="btn-acao-cargos"
                          onClick={() => abrirModalEditarNome(u)}
                          title="Alterar o nome completo cadastrado"
                        >
                          <Pencil size={13} />
                          <span>Nome</span>
                        </button>

                        <button
                          type="button"
                          className="btn-acao-cargos"
                          onClick={() => abrirModalCargos(u)}
                          title="Gerenciar cargos e políticas deste usuário"
                        >
                          <Shield size={14} />
                          <span>Cargos</span>
                        </button>

                        <button
                          type="button"
                          className={`btn-acao-status ${u.ativo ? 'btn-suspender' : 'btn-reativar'}`}
                          onClick={() => alternarStatusUsuario(u)}
                          disabled={ehOProprioUsuario && u.ativo}
                          title={
                            ehOProprioUsuario && u.ativo
                              ? 'Você não pode suspender seu próprio acesso'
                              : u.ativo
                              ? 'Suspender acesso'
                              : 'Reativar acesso'
                          }
                        >
                          {u.ativo ? <UserX size={14} /> : <UserCheck size={14} />}
                          <span>{u.ativo ? 'Suspender' : 'Reativar'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ==================================================================== */}
      {/* MODAL 1: GESTÃO DE POLÍTICAS / CARGOS                                */}
      {/* ==================================================================== */}
      {modalCargosAberto && usuarioSelecionado && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-cargos-container">
            <header className="modal-cargos-topo">
              <div>
                <h2 className="modal-cargos-titulo">Atribuição de Cargos</h2>
                <p className="modal-cargos-subtitulo">
                  {usuarioSelecionado.nome_completo || usuarioSelecionado.email}
                </p>
              </div>
              <button
                type="button"
                className="btn-fechar-modal"
                onClick={fecharModalCargos}
                title="Fechar"
              >
                <X size={18} />
              </button>
            </header>

            <div className="modal-cargos-corpo">
              <p className="rotulo-instrucao-cargos">
                Selecione os cargos permitidos para este colaborador no sistema de atendimento de filas:
              </p>

              <div className="lista-politicas-selecao">
                {politicasDisponiveis.map((pol) => {
                  const possuiPolitica = usuarioSelecionado.politicas?.some(
                    (p) => p.id === pol.id
                  );
                  const ehOMesmoUsuario = usuarioSelecionado.usuario_id === usuarioLogado?.id;
                  const ehAdmin = pol.nome.toLowerCase() === 'admin' || pol.nome.toLowerCase() === 'administrador';
                  const desabilitado = salvandoCargo || (ehOMesmoUsuario && ehAdmin && possuiPolitica);

                  return (
                    <label
                      key={pol.id}
                      className={`card-politica-opcao ${
                        possuiPolitica ? 'opcao-selecionada' : ''
                      } ${desabilitado ? 'opcao-desabilitada' : ''}`}
                    >
                      <div className="check-box-politica">
                        <input
                          type="checkbox"
                          checked={possuiPolitica}
                          disabled={desabilitado}
                          onChange={() => alternarPolitica(pol.id, possuiPolitica)}
                        />
                      </div>
                      <div className="info-politica-opcao">
                        <div className="linha-titulo-politica">
                          <span className="nome-politica-opcao">{pol.nome}</span>
                          {ehAdmin && (
                            <span className="tag-admin-mini">Acesso Total</span>
                          )}
                        </div>
                        <p className="descricao-politica-opcao">
                          {pol.descricao || 'Permissões específicas do sistema.'}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <footer className="modal-cargos-rodape">
              <button
                type="button"
                className="btn-concluir-modal"
                onClick={fecharModalCargos}
              >
                Concluir
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: NOVO COLABORADOR                                            */}
      {/* ==================================================================== */}
      {modalNovoAberto && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-cargos-container modal-formulario-container">
            <header className="modal-cargos-topo">
              <div>
                <h2 className="modal-cargos-titulo">Novo Colaborador</h2>
                <p className="modal-cargos-subtitulo">
                  Cadastre um colaborador e defina seu cargo inicial no sistema de filas.
                </p>
              </div>
              <button
                type="button"
                className="btn-fechar-modal"
                onClick={fecharModalNovo}
                disabled={salvandoNovo}
                title="Fechar"
              >
                <X size={18} />
              </button>
            </header>

            {erroNovo && (
              <div className="modal-alerta-erro" role="alert">
                <AlertCircle size={16} />
                <span>{erroNovo}</span>
              </div>
            )}

            <form onSubmit={tratarSalvarNovoColaborador} className="modal-form-corpo">
              <div className="modal-form-grupo">
                <label htmlFor="campo-nome-novo" className="modal-form-rotulo">
                  Nome Completo
                </label>
                <input
                  id="campo-nome-novo"
                  type="text"
                  className="modal-form-input"
                  placeholder="Ex: Maria da Silva"
                  value={nomeNovo}
                  onChange={(e) => setNomeNovo(e.target.value)}
                  autoFocus
                  required
                  disabled={salvandoNovo}
                />
              </div>

              <div className="modal-form-grupo">
                <label htmlFor="campo-email-novo" className="modal-form-rotulo">
                  E-mail Corporativo
                </label>
                <input
                  id="campo-email-novo"
                  type="email"
                  className="modal-form-input"
                  placeholder="colaborador@aesaojoao.com.br"
                  value={emailNovo}
                  onChange={(e) => setEmailNovo(e.target.value)}
                  required
                  disabled={salvandoNovo}
                />
              </div>

              <div className="modal-form-grupo">
                <label htmlFor="campo-senha-novo" className="modal-form-rotulo">
                  Senha Provisória
                </label>
                <input
                  id="campo-senha-novo"
                  type="password"
                  className="modal-form-input"
                  placeholder="Mínimo de 6 caracteres"
                  value={senhaNova}
                  onChange={(e) => setSenhaNova(e.target.value)}
                  minLength={6}
                  required
                  disabled={salvandoNovo}
                />
                <span className="modal-form-dica">
                  O colaborador poderá alterar essa senha posteriormente no sistema.
                </span>
              </div>

              <div className="modal-form-grupo">
                <label htmlFor="campo-politica-novo" className="modal-form-rotulo">
                  Cargo Inicial no Sistema
                </label>
                <select
                  id="campo-politica-novo"
                  className="modal-form-select"
                  value={politicaNovaId}
                  onChange={(e) => setPoliticaNovaId(e.target.value)}
                  disabled={salvandoNovo}
                >
                  <option value="">Nenhum cargo (Apenas vincular)</option>
                  {politicasDisponiveis.map((pol) => (
                    <option key={pol.id} value={pol.id}>
                      {pol.nome.charAt(0).toUpperCase() + pol.nome.slice(1)} {pol.descricao ? `- ${pol.descricao}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <footer className="modal-cargos-rodape">
                <button
                  type="button"
                  className="btn-cancelar-modal"
                  onClick={fecharModalNovo}
                  disabled={salvandoNovo}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-salvar-modal"
                  disabled={salvandoNovo}
                >
                  {salvandoNovo ? (
                    <>
                      <RefreshCw size={15} className="icone-girando" />
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} />
                      <span>Cadastrar Colaborador</span>
                    </>
                  )}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: EDITAR NOME DO COLABORADOR                                  */}
      {/* ==================================================================== */}
      {modalEditarNomeAberto && usuarioParaEditarNome && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-cargos-container modal-formulario-container">
            <header className="modal-cargos-topo">
              <div>
                <h2 className="modal-cargos-titulo">Editar Nome do Colaborador</h2>
                <p className="modal-cargos-subtitulo">
                  {usuarioParaEditarNome.email}
                </p>
              </div>
              <button
                type="button"
                className="btn-fechar-modal"
                onClick={fecharModalEditarNome}
                disabled={salvandoNome}
                title="Fechar"
              >
                <X size={18} />
              </button>
            </header>

            {erroEditarNome && (
              <div className="modal-alerta-erro" role="alert">
                <AlertCircle size={16} />
                <span>{erroEditarNome}</span>
              </div>
            )}

            <form onSubmit={tratarSalvarEditarNome} className="modal-form-corpo">
              <div className="modal-form-grupo">
                <label htmlFor="campo-nome-editado" className="modal-form-rotulo">
                  Nome Completo
                </label>
                <input
                  id="campo-nome-editado"
                  type="text"
                  className="modal-form-input"
                  placeholder="Nome completo do colaborador"
                  value={nomeEditado}
                  onChange={(e) => setNomeEditado(e.target.value)}
                  autoFocus
                  required
                  disabled={salvandoNome}
                />
              </div>

              <footer className="modal-cargos-rodape">
                <button
                  type="button"
                  className="btn-cancelar-modal"
                  onClick={fecharModalEditarNome}
                  disabled={salvandoNome}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-salvar-modal"
                  disabled={salvandoNome}
                >
                  {salvandoNome ? (
                    <>
                      <RefreshCw size={15} className="icone-girando" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar Alteração</span>
                  )}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
