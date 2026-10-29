/**
 * Canal de Sincronização Local entre Abas (BroadcastChannel)
 * Fornece sincronização em tempo real entre a aba da Atendente e a aba da TV.
 * O contrato de eventos espelha diretamente a futura integração com o Supabase Realtime.
 */

const NOME_CANAL = 'canal_fila_sao_joao';

let canal = null;

function obterCanal() {
  if (!canal && typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    canal = new BroadcastChannel(NOME_CANAL);
  }
  return canal;
}

export function enviarEvento(tipo, cargaUtil = {}) {
  const c = obterCanal();
  if (c) {
    try {
      c.postMessage({
        tipo,
        cargaUtil,
        timestamp: Date.now()
      });
    } catch (e) {
      console.warn('Erro ao postar mensagem no canal:', e);
    }
  }
}

export function inscreverEventos(callback) {
  const c = obterCanal();
  if (!c) return () => {};

  const manipulador = (evento) => {
    if (evento.data && typeof callback === 'function') {
      callback(evento.data);
    }
  };

  c.addEventListener('message', manipulador);
  return () => {
    c.removeEventListener('message', manipulador);
  };
}
