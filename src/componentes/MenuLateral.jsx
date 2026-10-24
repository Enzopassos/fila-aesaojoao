import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Headphones,
  Tv,
  Monitor,
  Tag,
  Users,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { useAutenticacao } from '../contextos/AutenticacaoContexto';
import logoAutoEscola from '../assets/logo-sao-joao.png';
import './MenuLateral.css';

export const MenuLateral = () => {
  const [recolhidaDesktop, setRecolhidaDesktop] = useState(false);
  const [menuAbertoMobile, setMenuAbertoMobile] = useState(false);
  const navigate = useNavigate();

  const { ehAdmin } = useAutenticacao();

  const aoFecharMobile = () => setMenuAbertoMobile(false);
  const aoAlternarRecolhidaDesktop = () => setRecolhidaDesktop(!recolhidaDesktop);

  const ITENS_PRINCIPAIS = [
    { caminho: '/atendimento', rotulo: 'Atendimento', icone: Headphones },
    { caminho: '/tv', rotulo: 'Painel TV', icone: Tv, abrirNovaAba: true },
  ];

  // Abas de Gestão: exibidas exclusivamente para Administradores
  const ITENS_GESTAO = [
    { caminho: '/relatorios', rotulo: 'Relatórios', icone: BarChart3 },
    { caminho: '/guiches', rotulo: 'Guichês', icone: Monitor },
    { caminho: '/categorias', rotulo: 'Categorias', icone: Tag },
    { caminho: '/usuarios', rotulo: 'Usuários', icone: Users },
  ];

  const renderizarItem = (item) => {
    const Icone = item.icone;

    if (item.abrirNovaAba) {
      return (
        <li key={item.caminho}>
          <a
            href={item.caminho}
            target="_blank"
            rel="noreferrer"
            onClick={aoFecharMobile}
            className="menu-lateral-item-btn"
            title={recolhidaDesktop ? item.rotulo : undefined}
          >
            <span className="menu-lateral-item-icone">
              <Icone size={20} />
            </span>
            {!recolhidaDesktop && (
              <span className="menu-lateral-item-texto">{item.rotulo}</span>
            )}
          </a>
        </li>
      );
    }

    return (
      <li key={item.caminho}>
        <NavLink
          to={item.caminho}
          onClick={aoFecharMobile}
          className={({ isActive }) =>
            `menu-lateral-item-btn ${isActive ? 'item-ativo' : ''}`
          }
          title={recolhidaDesktop ? item.rotulo : undefined}
        >
          <span className="menu-lateral-item-icone">
            <Icone size={20} />
          </span>
          {!recolhidaDesktop && (
            <span className="menu-lateral-item-texto">{item.rotulo}</span>
          )}
        </NavLink>
      </li>
    );
  };

  return (
    <aside
      className={`menu-lateral ${menuAbertoMobile ? 'mobile-aberta' : ''} ${recolhidaDesktop ? 'desktop-recolhida' : ''}`}
      aria-label="Menu Principal"
    >
      <div className="menu-lateral-cabecalho">
        <div
          className="menu-lateral-marca"
          title="Auto Escola São João"
          onClick={() => {
            navigate(ehAdmin ? '/relatorios' : '/atendimento');
            aoFecharMobile();
          }}
          style={{ cursor: 'pointer' }}
        >
          <div className="menu-lateral-logo-box">
            <img src={logoAutoEscola} alt="Auto Escola São João" className="menu-lateral-logo-img" />
          </div>
        </div>

        <button
          className="menu-lateral-btn-fechar-mobile"
          onClick={aoFecharMobile}
          aria-label="Fechar menu"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="menu-lateral-nav">
        <span className="menu-lateral-secao-rotulo">
          {!recolhidaDesktop ? 'Operacional' : 'Oper.'}
        </span>
        <ul className="menu-lateral-lista">
          {ITENS_PRINCIPAIS.map(renderizarItem)}
        </ul>

        {/* Abas Administrativas (Guichês, Categorias, Usuários) - Apenas se Admin */}
        {ehAdmin && (
          <>
            <div style={{ marginTop: '1.5rem' }}></div>
            <span className="menu-lateral-secao-rotulo">
              {!recolhidaDesktop ? 'Administração' : 'Adm.'}
            </span>
            <ul className="menu-lateral-lista">
              {ITENS_GESTAO.map(renderizarItem)}
            </ul>
          </>
        )}
      </nav>

      {/* Rodapé da Barra Lateral */}
      <div className="menu-lateral-rodape">
        <button
          type="button"
          className="menu-lateral-btn-recolher"
          onClick={aoAlternarRecolhidaDesktop}
          title={recolhidaDesktop ? 'Expandir barra lateral' : 'Recolher barra lateral'}
          aria-label={recolhidaDesktop ? 'Expandir barra lateral' : 'Recolher barra lateral'}
        >
          {recolhidaDesktop ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!recolhidaDesktop && <span>Recolher menu</span>}
        </button>
      </div>
    </aside>
  );
};
