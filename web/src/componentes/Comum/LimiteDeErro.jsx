import React, { Component } from 'react';

/**
 * Componente de fronteira de erro (Error Boundary) do React.
 * Captura exceções síncronas durante o ciclo de renderização dos componentes filhos,
 * impedindo que a aplicação desmonte completamente e resulte em uma tela branca.
 */
export class LimiteDeErro extends Component {
  constructor(props) {
    super(props);
    this.state = {
      temErro: false,
      erro: null,
      infoErro: null
    };
  }

  static getDerivedStateFromError(erro) {
    return {
      temErro: true,
      erro
    };
  }

  componentDidCatch(erro, infoErro) {
    this.setState({ infoErro });
    console.error('[LimiteDeErro] Erro capturado na árvore de componentes:', erro, infoErro);
  }

  reiniciarEstado = () => {
    this.setState({
      temErro: false,
      erro: null,
      infoErro: null
    });
    window.location.reload();
  };

  limparDadosERecarregar = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Erro ao limpar armazenamento:', e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.temErro) {
      const mensagemErro = this.state.erro?.message || 'Erro inesperado na renderização';
      const pilhaComponentes = this.state.infoErro?.componentStack || '';

      return (
        <div style={{
          minHeight: '100vh',
          width: '100vw',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          boxSizing: 'border-box',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            borderRadius: '14px',
            border: '1px solid #dc2626',
            maxWidth: '680px',
            width: '100%',
            padding: '32px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              color: '#ef4444',
              fontSize: '24px',
              marginBottom: '16px'
            }}>
              ⚠️
            </div>

            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 8px 0', color: '#f8fafc' }}>
              Falha na Exibição do Painel
            </h1>

            <p style={{ fontSize: '0.92rem', color: '#94a3b8', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              Ocorreu um erro durante a execução da interface. Os detalhes técnicos estão descritos abaixo para facilitar o diagnóstico:
            </p>

            <div style={{
              backgroundColor: '#0b0f19',
              borderRadius: '8px',
              padding: '16px',
              border: '1px solid #334155',
              marginBottom: '24px'
            }}>
              <div style={{ color: '#f87171', fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px', wordBreak: 'break-word' }}>
                {mensagemErro}
              </div>
              {pilhaComponentes && (
                <pre style={{
                  color: '#94a3b8',
                  fontSize: '0.78rem',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  maxHeight: '160px',
                  overflowY: 'auto'
                }}>
                  {pilhaComponentes}
                </pre>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={this.reiniciarEstado}
                style={{
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Recarregar Painel
              </button>

              <button
                onClick={this.limparDadosERecarregar}
                style={{
                  backgroundColor: 'transparent',
                  color: '#94a3b8',
                  border: '1px solid #475569',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Limpar Cache e Recarregar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
