import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAutenticacao } from '../contextos/AutenticacaoContexto';

export function RotaProtegida({ apenasAdmin = false, children }) {
  const { autenticado, ehAdmin, politicas, vinculoAtivo, carregando, sair, recarregarPermissoes, perfil, usuario } = useAutenticacao();
  const location = useLocation();

  if (carregando) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100%',
        backgroundColor: '#f8fafc',
        color: '#64748b',
        fontFamily: 'sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '36px',
            height: '36px',
            border: '3px solid #cbd5e1',
            borderTopColor: '#1e3a8a',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem auto'
          }} />
          <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
          <span>Verificando credenciais e políticas...</span>
        </div>
      </div>
    );
  }

  if (!autenticado) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 1. Bloqueio para usuário com acesso inativo/suspenso
  if (!vinculoAtivo) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        padding: '1.5rem',
        fontFamily: 'sans-serif'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '460px',
          width: '100%',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
          border: '1px solid #fee2e2'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#fee2e2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
            fontSize: '1.6rem'
          }}>
            🚫
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            Acesso Suspenso
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>
            Seu acesso a este sistema foi suspenso temporariamente pela administração da empresa.
          </p>
          <button
            onClick={sair}
            style={{
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Sair do Sistema
          </button>
        </div>
      </div>
    );
  }

  // 2. Bloqueio para usuário sem cargo/política atribuída (Pendente de Liberação)
  const temCargo = ehAdmin || (politicas && politicas.length > 0);
  if (!temCargo) {
    const nomeExibicao = perfil?.nome_completo || usuario?.email || 'Colaborador';

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        padding: '1.5rem',
        fontFamily: 'sans-serif'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '2.25rem 2rem',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
          textAlign: 'center',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#fef3c7',
            color: '#d97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto',
            fontSize: '1.6rem'
          }}>
            ⏳
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
            Acesso Pendente de Liberação
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
            Olá, <strong>{nomeExibicao}</strong>! Sua conta corporativa foi identificada, mas você ainda não possui um cargo de <strong>Atendente</strong> ou <strong>Administrador</strong> liberado para este sistema de filas.
          </p>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: '0 0 1.75rem 0' }}>
            Solicite a liberação ao administrador da Auto Escola São João.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button
              onClick={() => recarregarPermissoes()}
              style={{
                backgroundColor: '#1e3a8a',
                color: '#ffffff',
                border: 'none',
                padding: '0.65rem 1.15rem',
                borderRadius: '8px',
                fontSize: '0.86rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Verificar Novamente
            </button>
            <button
              onClick={sair}
              style={{
                backgroundColor: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                padding: '0.65rem 1.15rem',
                borderRadius: '8px',
                fontSize: '0.86rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Bloqueio de rotas administrativas para quem não é Admin
  if (apenasAdmin && !ehAdmin) {
    return <Navigate to="/atendimento" replace />;
  }

  return children ? children : <Outlet />;
}
