import React, { useState, useEffect } from 'react';
import { Tag, Plus, CheckCircle2, XCircle, Edit2, Sparkles, RefreshCw, AlertCircle, Trash2 } from 'lucide-react';
import { categoriaServico } from '../../servicos/categoriaServico';
import { CabecalhoPagina } from '../CabecalhoPagina';
import './GestaoCategorias.css';

export function GestaoCategorias() {
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [categoriaEdicao, setCategoriaEdicao] = useState(null);

  const [nome, setNome] = useState('');
  const [prefixo, setPrefixo] = useState('');
  const [prioridade, setPrioridade] = useState(false);

  async function carregarCategorias() {
    setCarregando(true);
    setErro(null);
    try {
      const dados = await categoriaServico.listarCategorias(false);
      setCategorias(dados);
    } catch (err) {
      console.error('[GestaoCategorias] Erro ao carregar categorias:', err);
      setErro(err?.message || 'Falha ao carregar as categorias de atendimento.');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarCategorias();
  }, []);

  function abrirModal(cat = null) {
    if (cat) {
      setCategoriaEdicao(cat);
      setNome(cat.nome);
      setPrefixo(cat.prefixo);
      setPrioridade(Boolean(cat.prioridade));
    } else {
      setCategoriaEdicao(null);
      setNome('');
      setPrefixo('');
      setPrioridade(false);
    }
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setCategoriaEdicao(null);
    setNome('');
    setPrefixo('');
    setPrioridade(false);
  }

  async function salvarCategoria(e) {
    e.preventDefault();
    if (!nome || !prefixo) return;

    setSalvando(true);
    try {
      if (categoriaEdicao) {
        await categoriaServico.atualizarCategoria(categoriaEdicao.id, {
          nome,
          prefixo: prefixo.toUpperCase(),
          prioridade
        });
      } else {
        await categoriaServico.criarCategoria({
          nome,
          prefixo: prefixo.toUpperCase(),
          prioridade
        });
      }
      fecharModal();
      await carregarCategorias();
    } catch (err) {
      alert(err?.message || 'Falha ao salvar categoria.');
    } finally {
      setSalvando(false);
    }
  }

  async function alternarStatus(cat) {
    try {
      await categoriaServico.alternarStatusCategoria(cat.id, !cat.ativo);
      await carregarCategorias();
    } catch (err) {
      alert(err?.message || 'Falha ao alterar status da categoria.');
    }
  }

  async function excluirCategoria(id) {
    if (window.confirm('Deseja realmente remover esta categoria de atendimento?')) {
      try {
        await categoriaServico.excluirCategoria(id);
        await carregarCategorias();
      } catch (err) {
        alert(err?.message || 'Falha ao excluir categoria.');
      }
    }
  }

  return (
    <div className="gestao-pagina-container">
      <CabecalhoPagina
        icone={Tag}
        titulo="Categorias de Atendimento"
        subtitulo="Configure as filas de atendimento, letras de prefixo das senhas e regras de prioridade legal."
        acoes={
          <button
            type="button"
            className="btn-adicionar-principal"
            onClick={() => abrirModal()}
          >
            <Plus size={18} />
            <span>Nova Categoria</span>
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

      {carregando && categorias.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
          <RefreshCw size={24} className="animacao-girando" style={{ marginBottom: '0.5rem' }} />
          <p>Carregando categorias do banco de dados...</p>
        </div>
      ) : (
        <div className="categorias-tabela-card">
          <table className="tabela-categorias">
            <thead>
              <tr>
                <th>Prefixo</th>
                <th>Nome da Categoria</th>
                <th>Tipo de Fila</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map((cat) => (
                <tr key={cat.id}>
                  <td>
                    <span
                      className="prefixo-badge"
                      style={{
                        backgroundColor: cat.cor_fundo || '#dbeafe',
                        color: cat.cor_badge || '#2563eb'
                      }}
                    >
                      {cat.prefixo}
                    </span>
                  </td>
                  <td className="categoria-nome-coluna">{cat.nome}</td>
                  <td>
                    {cat.prioridade ? (
                      <span className="badge-prioridade-legal">
                        <Sparkles size={14} />
                        <span>Prioridade Legal (Lei 10.048)</span>
                      </span>
                    ) : (
                      <span className="badge-normal-fila">Atendimento Geral</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => alternarStatus(cat)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      title="Clique para alternar status"
                    >
                      <span className={cat.ativo ? 'badge-status-ativo' : 'badge-status-inativo'}>
                        {cat.ativo ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        <span>{cat.ativo ? 'Ativa' : 'Inativa'}</span>
                      </span>
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn-editar-cat"
                        onClick={() => abrirModal(cat)}
                      >
                        <Edit2 size={15} />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        className="btn-icone btn-icone-perigo"
                        onClick={() => excluirCategoria(cat.id)}
                        title="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {categorias.length === 0 && !carregando && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                    Nenhuma categoria de atendimento cadastrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <div className="modal-overlay">
          <div className="modal-container">
            <h2 className="modal-titulo">
              {categoriaEdicao ? 'Editar Categoria' : 'Nova Categoria de Atendimento'}
            </h2>
            <form onSubmit={salvarCategoria} className="modal-formulario">
              <div className="campo-form">
                <label>Nome da Categoria</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Renovação CNH"
                  required
                />
              </div>

              <div className="campo-form">
                <label>Letra do Prefixo (1 letra, ex: R, D, A)</label>
                <input
                  type="text"
                  maxLength={2}
                  value={prefixo}
                  onChange={(e) => setPrefixo(e.target.value)}
                  placeholder="R"
                  style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                  required
                />
              </div>

              <div className="campo-form-checkbox">
                <label className="checkbox-rotulo">
                  <input
                    type="checkbox"
                    checked={prioridade}
                    onChange={(e) => setPrioridade(e.target.checked)}
                  />
                  <span>Atendimento com Prioridade Legal (Idosos, Gestantes, PCD)</span>
                </label>
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
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
