import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { useAutenticacao } from '../../contextos/AutenticacaoContexto';
import logoAutoEscola from '../../assets/logo-sao-joao.png';
import './Login.css';

/**
 * Componente corporativo de autenticação (Login).
 * Layout executivo split-screen: formulário simétrico à esquerda e painel azul sólido reservado à direita.
 */
export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { entrar, autenticado, ehAdmin, carregando: carregandoSessao } = useAutenticacao();

  const obterDestino = (adminAtivo = ehAdmin) => {
    if (location.state?.from?.pathname) {
      return location.state.from.pathname;
    }
    return adminAtivo ? '/relatorios' : '/atendimento';
  };

  // Redireciona caso o usuário já esteja autenticado
  useEffect(() => {
    if (!carregandoSessao && autenticado) {
      navigate(obterDestino(ehAdmin), { replace: true });
    }
  }, [autenticado, carregandoSessao, ehAdmin, navigate]);

  // Estados dos campos de autenticação
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  // Estados de controle da interface
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [mensagemErro, setMensagemErro] = useState(null);

  const traduzirMensagemErro = (mensagem) => {
    if (!mensagem) return 'Ocorreu uma falha ao conectar com o serviço de autenticação.';
    const msg = mensagem.toLowerCase();
    if (msg.includes('invalid login credentials') || msg.includes('invalid credentials')) {
      return 'E-mail ou senha incorretos.';
    }
    if (msg.includes('password should be at least')) {
      return 'A senha deve possuir pelo menos 6 caracteres.';
    }
    if (msg.includes('email not confirmed')) {
      return 'O e-mail informado ainda não foi confirmado na sua caixa de entrada.';
    }
    if (msg.includes('too many requests')) {
      return 'Muitas tentativas consecutivas. Aguarde alguns instantes.';
    }
    return mensagem;
  };

  const tratarEnvioFormulario = async (evento) => {
    evento.preventDefault();
    setMensagemErro(null);

    const emailLimpo = email.trim();

    // Validação preventiva Fail-Fast
    if (!emailLimpo || !senha.trim()) {
      setMensagemErro('Por favor, informe seu e-mail e sua senha de acesso.');
      return;
    }

    if (senha.length < 6) {
      setMensagemErro('A senha deve possuir pelo menos 6 caracteres.');
      return;
    }

    setCarregando(true);

    try {
      const respostaAuth = await entrar(emailLimpo, senha);
      navigate(obterDestino(respostaAuth?.ehAdmin), { replace: true });
    } catch (erroGenerico) {
      console.error('Falha no processo de autenticação:', erroGenerico);
      setMensagemErro(traduzirMensagemErro(erroGenerico?.message));
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="pagina-auth-layout">
      {/* ==================================================================== */}
      {/* 1. COLUNA ESQUERDA: FORMULÁRIO LIMPO E SIMÉTRICO                     */}
      {/* ==================================================================== */}
      <main className="auth-coluna-formulario">
        {/* Bloco Central com Logo e Formulário */}
        <div className="auth-form-conteudo-central">
          {/* Logotipo Centralizado e Simétrico aos Inputs */}
          <header className="auth-form-cabecalho-logo">
            <img src={logoAutoEscola} alt="Auto Escola São João" className="auth-form-logo-img" />
          </header>

          {/* Cabeçalho do Formulário */}
          <div className="auth-cabecalho-texto">
            <h1 className="auth-titulo-principal">Acesse sua conta</h1>
            <p className="auth-subtitulo-principal">
              Informe suas credenciais para acessar o painel de atendimento.
            </p>
          </div>

          {/* Mensagens de Alerta em Cores Sólidas */}
          {mensagemErro && (
            <div className="auth-box-alerta auth-box-alerta-erro" role="alert">
              <AlertCircle size={18} className="auth-box-alerta-icone" aria-hidden="true" />
              <span>{mensagemErro}</span>
            </div>
          )}

          {/* Formulário de Acesso */}
          <form onSubmit={tratarEnvioFormulario} className="auth-formulario" noValidate>
            {/* Campo E-mail */}
            <div className="auth-grupo-campo">
              <label htmlFor="campo-email" className="auth-rotulo-campo">
                E-mail
              </label>
              <div className="auth-input-wrapper">
                <span className="auth-icone-lado-esquerdo">
                  <Mail size={18} aria-hidden="true" />
                </span>
                <input
                  id="campo-email"
                  type="email"
                  className="auth-input-control"
                  placeholder="seu.email@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="auth-grupo-campo">
              <label htmlFor="campo-senha" className="auth-rotulo-campo">
                Senha
              </label>
              <div className="auth-input-wrapper">
                <span className="auth-icone-lado-esquerdo">
                  <Lock size={18} aria-hidden="true" />
                </span>
                <input
                  id="campo-senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  className="auth-input-control com-toggle"
                  placeholder="Sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="auth-botao-visibilidade-senha"
                  onClick={() => setMostrarSenha((anterior) => !anterior)}
                  title={mostrarSenha ? 'Ocultar senha' : 'Exibir senha'}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Botão de Ação Sólido */}
            <button
              id="botao-submeter-login"
              type="submit"
              className="auth-botao-principal"
              disabled={carregando}
            >
              {carregando ? (
                <>
                  <span className="auth-spinner-carregando" aria-hidden="true" />
                  <span>Acessando...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight size={17} aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Rodapé do Formulário */}
        <footer className="auth-form-rodape">
          <span>&copy; {new Date().getFullYear()} Auto Escola São João</span>
          <div className="auth-links-termos">
            <span className="auth-link-termo-item">Segurança</span>
            <span className="auth-link-termo-item">Privacidade</span>
          </div>
        </footer>
      </main>

      {/* ==================================================================== */}
      {/* 2. COLUNA DIREITA: FUNDO AZUL SÓLIDO (RESERVADO PARA FUTURO CONTEÚDO) */}
      {/* ==================================================================== */}
      <aside className="auth-coluna-visual" aria-label="Painel Lateral" />
    </div>
  );
}
