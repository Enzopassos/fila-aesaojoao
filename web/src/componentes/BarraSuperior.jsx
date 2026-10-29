import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, ChevronDown, KeyRound } from 'lucide-react';
import { useAutenticacao } from '../contextos/AutenticacaoContexto';
import './BarraSuperior.css';

export const BarraSuperior = () => {
  const { usuario, perfil, ehAdmin, politicas, sair } = useAutenticacao();
  const [menuAberto, setMenuAberto] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  // Fecha o dropdown ao clicar fora ou pressionar ESC
  useEffect(() => {
    const lidarComCliqueFora = (evento) => {
      if (containerRef.current && !containerRef.current.contains(evento.target)) {
        setMenuAberto(false);
      }
    };

    const lidarComTeclaEsc = (evento) => {
      if (evento.key === 'Escape') {
        setMenuAberto(false);
      }
    };

    if (menuAberto) {
      document.addEventListener('mousedown', lidarComCliqueFora);
      document.addEventListener('keydown', lidarComTeclaEsc);
    }

    return () => {
      document.removeEventListener('mousedown', lidarComCliqueFora);
      document.removeEventListener('keydown', lidarComTeclaEsc);
    };
  }, [menuAberto]);

  const lidarComSair = async () => {
    try {
      setMenuAberto(false);
      await sair();
      navigate('/login');
    } catch (erro) {
      console.error('[BarraSuperior] Erro ao encerrar sessão:', erro);
    }
  };

  const obterIniciaisUsuario = () => {
    const nome = perfil?.nome_completo || usuario?.user_metadata?.nome_completo;
    if (nome) {
      const partes = nome.trim().split(' ');
      return partes.length >= 2
        ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
        : partes[0].slice(0, 2).toUpperCase();
    }
    const email = usuario?.email;
    return email ? email.slice(0, 2).toUpperCase() : 'SJ';
  };

  const obterNomeExibicao = () => {
    if (perfil?.nome_completo) {
      return perfil.nome_completo;
    }
    if (usuario?.user_metadata?.nome_completo) {
      return usuario.user_metadata.nome_completo;
    }
    if (usuario?.email) {
      return usuario.email.split('@')[0];
    }
    return 'Usuário';
  };

  const obterCargo = () => {
    if (ehAdmin) return 'Administrador';
    if (politicas?.includes('atendente')) return 'Atendente';
    return 'Colaborador';
  };

  const obterClasseCargo = () => {
    if (ehAdmin) return 'cargo-admin';
    if (politicas?.includes('atendente')) return 'cargo-atendente';
    return 'cargo-colaborador';
  };

  return (
    <header className="barra-superior" aria-label="Barra Superior">
      <div className="barra-superior-espacador"></div>

      <div className="barra-superior-usuario-container" ref={containerRef}>
        {usuario && (
          <button
            type="button"
            className={`barra-superior-pilula ${menuAberto ? 'ativa' : ''}`}
            onClick={() => setMenuAberto((anterior) => !anterior)}
            aria-expanded={menuAberto}
            aria-haspopup="true"
            title="Menu do usuário"
          >
            <div className="barra-superior-avatar">
              {obterIniciaisUsuario()}
            </div>
            <span className="barra-superior-usuario-nome">{obterNomeExibicao()}</span>
            <ChevronDown size={15} className={`barra-superior-chevron ${menuAberto ? 'rotacionado' : ''}`} />
          </button>
        )}

        {menuAberto && usuario && (
          <div className="barra-superior-dropdown" role="menu">
            <div className="barra-superior-dropdown-header">
              <span className="barra-superior-dropdown-rotulo">Conectado como</span>
              <span className="barra-superior-dropdown-nome">{obterNomeExibicao()}</span>
              <span className="barra-superior-dropdown-email">{usuario.email}</span>
            </div>

            <div className="barra-superior-dropdown-divisor"></div>

            <button
              type="button"
              className="barra-superior-dropdown-item"
              onClick={() => {
                setMenuAberto(false);
                navigate('/alterar-senha');
              }}
              role="menuitem"
            >
              <KeyRound size={16} />
              <span>Trocar senha</span>
            </button>

            <button
              type="button"
              className="barra-superior-dropdown-item-sair"
              onClick={lidarComSair}
              role="menuitem"
            >
              <LogOut size={16} />
              <span>Sair do sistema</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
