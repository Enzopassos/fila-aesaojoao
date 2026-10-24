/**
 * Serviço de Áudio e Síntese de Voz (TTS)
 * Áudio ativo por padrão.
 */

let contextoAudio = null;
let audioHabilitado = true;

export function inicializarContextoAudio() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!contextoAudio && AudioContextClass) {
      contextoAudio = new AudioContextClass();
    }
    if (contextoAudio && contextoAudio.state === 'suspended') {
      contextoAudio.resume();
    }
    return true;
  } catch (e) {
    console.warn('Erro ao inicializar AudioContext:', e);
    return false;
  }
}

export function obterStatusAudio() {
  return audioHabilitado;
}

export function definirStatusAudio(ativo) {
  audioHabilitado = ativo;
  if (ativo) {
    inicializarContextoAudio();
  }
  return audioHabilitado;
}

function tocarGongoChamada() {
  return new Promise((resolve) => {
    try {
      if (!contextoAudio) {
        inicializarContextoAudio();
      }
      if (!contextoAudio) {
        resolve();
        return;
      }

      const agora = contextoAudio.currentTime;

      // 1º Tom - Ré 5 (587.33 Hz)
      const osc1 = contextoAudio.createOscillator();
      const ganho1 = contextoAudio.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, agora);
      ganho1.gain.setValueAtTime(0.2, agora);
      ganho1.gain.exponentialRampToValueAtTime(0.001, agora + 0.35);

      osc1.connect(ganho1);
      ganho1.connect(contextoAudio.destination);
      osc1.start(agora);
      osc1.stop(agora + 0.35);

      // 2º Tom - Lá 5 (880.00 Hz)
      const osc2 = contextoAudio.createOscillator();
      const ganho2 = contextoAudio.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, agora + 0.2);
      ganho2.gain.setValueAtTime(0.001, agora);
      ganho2.gain.setValueAtTime(0.25, agora + 0.2);
      ganho2.gain.exponentialRampToValueAtTime(0.0001, agora + 0.85);

      osc2.connect(ganho2);
      ganho2.connect(contextoAudio.destination);
      osc2.start(agora + 0.2);
      osc2.stop(agora + 0.85);

      setTimeout(() => {
        resolve();
      }, 700);
    } catch (err) {
      console.warn('Falha na reprodução do gongo:', err);
      resolve();
    }
  });
}

function falarTexto(texto) {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();

    const enunciado = new SpeechSynthesisUtterance(texto);
    enunciado.lang = 'pt-BR';
    enunciado.rate = 0.95;
    enunciado.pitch = 1.05;

    const vozes = window.speechSynthesis.getVoices();
    const vozPt = vozes.find((v) => v.lang === 'pt-BR' || v.lang.startsWith('pt')) || null;
    if (vozPt) {
      enunciado.voice = vozPt;
    }

    enunciado.onend = () => resolve();
    enunciado.onerror = () => resolve();

    window.speechSynthesis.speak(enunciado);
  });
}

function soletrarCodigo(codigo) {
  if (!codigo) return '';
  return codigo
    .split('')
    .map((caractere) => (caractere === '0' ? 'zero' : caractere))
    .join(', ');
}

export async function anunciarChamada(codigoFormatado, guicheNumero) {
  if (!audioHabilitado) return;

  await tocarGongoChamada();

  const codigoSoletrado = soletrarCodigo(codigoFormatado);
  const texto = `Senha ${codigoSoletrado}. Guichê ${guicheNumero}.`;

  await falarTexto(texto);
}
