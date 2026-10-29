import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { useAutenticacao } from '../../contextos/AutenticacaoContexto';
import { usuarioServico } from '../../servicos/usuarioServico';
import { CabecalhoPagina } from '../CabecalhoPagina';
import './AlterarSenha.css';

export function AlterarSenha() {
  const { usuario, perfil } = useAutenticacao();
  const navigate = useNavigate();

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(null);

  const lidarComEnvio = async (evento) => {
    evento.preventDefault();
    setErro(null);
    setSucesso(null);

    // Validações Fail-Fast locais
    if (!senhaAtual.trim()) {
      setErro('Por favor, informe a sua senha atual.');
      return;
    }

    if (!novaSenha || novaSenha.length < 6) {
      setErro('A nova senha deve possuir no mínimo 6 caracteres.');
      return;
    }

    if (novaSenha !== confirmarSenha) {
      setErro('A confirmação da nova senha não confere.');
      return;
    }

    if (senhaAtual === novaSenha) {
      setErro('A nova senha não pode ser igual à senha atual.');
      return;
    }

    setSalvando(true);

    try {
      await usuarioServico.alterarSenhaPropria(usuario?.email, senhaAtual, novaSenha);

      // Limpa os campos do formulário
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');

      setSucesso('Sua senha foi alterada com sucesso! Suas novas credenciais já estão ativas.');
    } catch (err) {
      console.error('[AlterarSenha] Falha ao atualizar senha:', err);
      setErro(err?.message || 'Ocorreu um erro ao tentar alterar sua senha.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="alterar-senha-container">
      <CabecalhoPagina
        icone={KeyRound}
        titulo="Alteração de Senha"
        subtitulo="Atualize suas credenciais de acesso ao sistema de filas com segurança."
        acoes={
          <button
            type="button"
            className="btn-cancelar-senha"
            onClick={() => navigate('/atendimento')}
            title="Voltar para a página anterior"
          >
            <ArrowLeft size={16} style={{ marginRight: '0.4rem' }} />
            <span>Voltar</span>
          </button>
        }
      />

      <div className="alterar-senha-conteudo">
        {/* Card Informativo à Esquerda */}
        <div className="card-informativo-senha">
          <div className="card-informativo-topo">
            <h2 className="card-informativo-titulo">Recomendações de Segurança</h2>
            <p className="card-informativo-descricao">
              Mantenha o seu acesso individual seguro para garantir a integridade dos atendimentos e auditorias da autoescola.
            </p>
          </div>

          <div className="card-informativo-lista">
            <div className="card-informativo-item">
              <div className="card-informativo-item-icone">
                <CheckCircle2 size={18} />
              </div>
              <div className="card-informativo-item-textos">
                <strong>Comprimento Mínimo</strong>
                <span>Crie uma senha com pelo menos 6 caracteres (recomendamos 8 dígitos ou mais).</span>
              </div>
            </div>

            <div className="card-informativo-item">
              <div className="card-informativo-item-icone">
                <CheckCircle2 size={18} />
              </div>
              <div className="card-informativo-item-textos">
                <strong>Combinação Forte</strong>
                <span>Misture letras maiúsculas, minúsculas e números para elevar a proteção.</span>
              </div>
            </div>

            <div className="card-informativo-item">
              <div className="card-informativo-item-icone">
                <AlertCircle size={18} />
              </div>
              <div className="card-informativo-item-textos">
                <strong>Acesso Pessoal</strong>
                <span>Nunca compartilhe sua senha com terceiros nem opere guichês em contas alheias.</span>
              </div>
            </div>

            <div className="card-informativo-item">
              <div className="card-informativo-item-icone">
                <RefreshCw size={18} />
              </div>
              <div className="card-informativo-item-textos">
                <strong>Sessão Preservada</strong>
                <span>Ao salvar, sua sessão permanecerá ativa para continuar o trabalho normalmente.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card do Formulário à Direita */}
        <div className="alterar-senha-card">
          <form className="alterar-senha-formulario" onSubmit={lidarComEnvio}>
            {/* Alerta de Erro */}
            {erro && (
              <div className="alerta-feedback erro" role="alert">
                <AlertCircle size={20} style={{ flexShrink: 0 }} />
                <span>{erro}</span>
              </div>
            )}

            {/* Alerta de Sucesso */}
            {sucesso && (
              <div className="alerta-feedback sucesso" role="status">
                <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
                <span>{sucesso}</span>
              </div>
            )}

            {/* Campo: Senha Atual */}
            <div className="campo-grupo">
              <label className="campo-rotulo" htmlFor="input-senha-atual">
                <span>Senha Atual</span>
              </label>
              <div className="input-com-icone-wrapper">
                <Lock size={17} className="input-icone-esquerda" />
                <input
                  id="input-senha-atual"
                  type={mostrarSenhaAtual ? 'text' : 'password'}
                  className="input-senha"
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  placeholder="Digite sua senha atual"
                  disabled={salvando}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="btn-alternar-visibilidade"
                  onClick={() => setMostrarSenhaAtual(!mostrarSenhaAtual)}
                  title={mostrarSenhaAtual ? 'Ocultar senha' : 'Exibir senha'}
                  tabIndex={-1}
                >
                  {mostrarSenhaAtual ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Campo: Nova Senha */}
            <div className="campo-grupo">
              <label className="campo-rotulo" htmlFor="input-nova-senha">
                <span>Nova Senha</span>
                <span className="campo-ajuda">Mínimo de 6 caracteres</span>
              </label>
              <div className="input-com-icone-wrapper">
                <KeyRound size={17} className="input-icone-esquerda" />
                <input
                  id="input-nova-senha"
                  type={mostrarNovaSenha ? 'text' : 'password'}
                  className="input-senha"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Digite sua nova senha"
                  disabled={salvando}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="btn-alternar-visibilidade"
                  onClick={() => setMostrarNovaSenha(!mostrarNovaSenha)}
                  title={mostrarNovaSenha ? 'Ocultar senha' : 'Exibir senha'}
                  tabIndex={-1}
                >
                  {mostrarNovaSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Campo: Confirmar Nova Senha */}
            <div className="campo-grupo">
              <label className="campo-rotulo" htmlFor="input-confirmar-senha">
                <span>Confirmar Nova Senha</span>
              </label>
              <div className="input-com-icone-wrapper">
                <KeyRound size={17} className="input-icone-esquerda" />
                <input
                  id="input-confirmar-senha"
                  type={mostrarConfirmarSenha ? 'text' : 'password'}
                  className="input-senha"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  placeholder="Repita sua nova senha"
                  disabled={salvando}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="btn-alternar-visibilidade"
                  onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                  title={mostrarConfirmarSenha ? 'Ocultar senha' : 'Exibir senha'}
                  tabIndex={-1}
                >
                  {mostrarConfirmarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="alterar-senha-acoes">
              <button
                type="button"
                className="btn-cancelar-senha"
                onClick={() => navigate('/atendimento')}
                disabled={salvando}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="btn-salvar-senha"
                disabled={salvando}
              >
                {salvando ? (
                  <>
                    <RefreshCw size={16} className="animacao-girando" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <span>Atualizar Senha</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
