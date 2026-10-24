import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle2, XCircle, Edit2, Trash2, RefreshCw, AlertCircle, Monitor } from 'lucide-react';
import { guicheServico } from '../../servicos/guicheServico';
import { CabecalhoPagina } from '../CabecalhoPagina';
import './GestaoGuiches.css';

export function GestaoGuiches() {
  const [listaGuiches, setListaGuiches] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [guicheEmEdicao, setGuicheEmEdicao] = useState(null);
  const [numero, setNumero] = useState('');
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');

  async function carregarGuiches() {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await guicheServico.listarGuiches(false);
      setListaGuiches(dados);
    } catch (err) {
      console.error('[GestaoGuiches] Erro ao carregar guichês:', err);
      setErro(err?.message || 'Erro ao carregar a lista de guichês.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarGuiches();
  }, []);

  function abrirModal(guiche = null) {
    if (guiche) {
      setGuicheEmEdicao(guiche);
      setNumero(guiche.numero);
      setNome(guiche.nome);
      setDescricao(guiche.descricao || '');
    } else {
      setGuicheEmEdicao(null);
      const proximoNum = String(listaGuiches.length + 1).padStart(2, '0');
      setNumero(proximoNum);
      setNome(`Guichê ${proximoNum}`);
      setDescricao(`Mesa ${proximoNum} - Atendimento Geral`);
    }
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setGuicheEmEdicao(null);
    setNumero('');
    setNome('');
    setDescricao('');
  }

  async function salvarGuiche(e) {
    e.preventDefault();
    if (!numero || !nome) return;

    setSalvando(true);
    try {
      if (guicheEmEdicao) {
        await guicheServico.atualizarGuiche(guicheEmEdicao.id, {
          numero,
          nome,
          descricao
        });
      } else {
        await guicheServico.criarGuiche({
          numero,
          nome,
          descricao
        });
      }
      fecharModal();
      await carregarGuiches();
    } catch (err) {
      alert(err?.message || 'Falha ao salvar guichê.');
    } finally {
      setSalvando(false);
    }
  }

  async function alternarStatus(guiche) {
    try {
      await guicheServico.alternarStatusGuiche(guiche.id, !guiche.ativo);
      await carregarGuiches();
    } catch (err) {
      alert(err?.message || 'Falha ao alterar status do guichê.');
    }
  }

  async function excluirGuiche(id) {
    if (window.confirm('Deseja realmente remover este guichê do sistema?')) {
      try {
        await guicheServico.excluirGuiche(id);
        await carregarGuiches();
      } catch (err) {
        alert(err?.message || 'Falha ao excluir guichê.');
      }
    }
  }

  return (
    <div className="gestao-pagina-container">
      <CabecalhoPagina
        icone={Monitor}
        titulo="Gestão de Guichês"
        subtitulo="Cadastre, edite e configure as mesas e postos de atendimento da autoescola."
        acoes={
          <button
            type="button"
            className="btn-adicionar-principal"
            onClick={() => abrirModal()}
          >
            <Plus size={18} />
            <span>Novo Guichê</span>
          </button>
        }
      />

      {erro && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: '#991b1b'
        }}>
          <AlertCircle size={20} />
          <span>{erro}</span>
        </div>
      )}

      {carregando && listaGuiches.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <RefreshCw size={24} className="animacao-girando" style={{ marginBottom: '0.5rem' }} />
          <p>Carregando guichês do banco de dados...</p>
        </div>
      ) : (
        <div className="guiches-grade">
          {listaGuiches.map((g) => (
            <div key={g.id} className={`guiche-card-gestao ${g.ativo ? 'ativo' : 'inativo'}`}>
              <div className="guiche-card-header">
                <div className="guiche-numero-pill">GUICHÊ {g.numero}</div>
                <span className={`badge-status ${g.ativo ? 'status-ativo' : 'status-inativo'}`}>
                  {g.ativo ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  <span>{g.ativo ? 'Ativo' : 'Inativo'}</span>
                </span>
              </div>

              <div className="guiche-card-corpo">
                <h3 className="guiche-nome">{g.nome}</h3>
                <p className="guiche-desc">{g.descricao || 'Sem descrição cadastrada'}</p>
              </div>

              <div className="guiche-card-acoes">
                <button
                  type="button"
                  className="btn-acao-secundario"
                  onClick={() => alternarStatus(g)}
                >
                  {g.ativo ? 'Desativar' : 'Ativar'}
                </button>

                <div className="icones-acoes">
                  <button
                    type="button"
                    className="btn-icone"
                    onClick={() => abrirModal(g)}
                    title="Editar"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    type="button"
                    className="btn-icone btn-icone-perigo"
                    onClick={() => excluirGuiche(g.id)}
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {listaGuiches.length === 0 && !carregando && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#64748b' }}>
              Nenhum guichê cadastrado no momento. Clique em "Novo Guichê" para adicionar.
            </div>
          )}
        </div>
      )}

      {modalAberto && (
        <div className="modal-overlay">
          <div className="modal-container">
            <h2 className="modal-titulo">
              {guicheEmEdicao ? 'Editar Guichê' : 'Cadastrar Novo Guichê'}
            </h2>
            <form onSubmit={salvarGuiche} className="modal-formulario">
              <div className="campo-form">
                <label>Número do Guichê (ex: 01, 02)</label>
                <input
                  type="text"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="01"
                  required
                />
              </div>

              <div className="campo-form">
                <label>Nome de Identificação</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Guichê 01 - Recepção"
                  required
                />
              </div>

              <div className="campo-form">
                <label>Descrição / Localização</label>
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Mesa 01 ao lado da entrada"
                />
              </div>

              <div className="modal-botoes">
                <button
                  type="button"
                  className="btn-cancelar"
                  onClick={fecharModal}
                  disabled={salvando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-salvar"
                  disabled={salvando}
                >
                  {salvando ? 'Salvando...' : 'Salvar Guichê'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
