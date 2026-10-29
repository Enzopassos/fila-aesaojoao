/**
 * Serviço de Áudio e Chamada de Fila (Padrão Correios / Alta Compatibilidade)
 * Utiliza o Web Audio API com amostras gravadas de voz feminina em português,
 * garantindo funcionamento idêntico e consistente em qualquer sistema operacional
 * (Linux, Smart TVs, Android, Windows, Mac), sem depender de pacotes TTS externos.
 */

let contextoAudio = null;
let audioHabilitado = true;
const cacheBuffersAudio = new Map();

/**
 * Cria ou recupera a instância compartilhada de AudioContext.
 */
function obterContextoAudio() {
  if (!contextoAudio && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      contextoAudio = new AudioContextClass();
    }
  }
  return contextoAudio;
}

/**
 * Inicializa e retoma o AudioContext do navegador.
 */
export async function inicializarContextoAudio() {
  try {
    const ctx = obterContextoAudio();
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume();
    }
    return Boolean(ctx && ctx.state === 'running');
  } catch (e) {
    console.warn('[Audio] Erro ao inicializar AudioContext:', e);
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

/**
 * Mantido por compatibilidade de interface.
 */
export async function carregarVozesDisponiveis() {
  return [];
}

/**
 * Pausa utilitária assíncrona.
 */
function aguardar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Toca o gongo bimodal característico de aeroportos e agências dos Correios.
 */
export function tocarGongoChamada() {
  return new Promise(async (resolve) => {
    try {
      const ctx = obterContextoAudio();
      if (!ctx) {
        resolve();
        return;
      }

      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch (e) {
          console.warn('[Audio] Falha ao resumir AudioContext no gongo:', e);
        }
      }

      if (ctx.state !== 'running') {
        resolve();
        return;
      }

      const agora = ctx.currentTime;

      // 1º Tom - Ré 5 (587.33 Hz)
      const osc1 = ctx.createOscillator();
      const ganho1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, agora);
      ganho1.gain.setValueAtTime(0.25, agora);
      ganho1.gain.exponentialRampToValueAtTime(0.001, agora + 0.35);

      osc1.connect(ganho1);
      ganho1.connect(ctx.destination);
      osc1.start(agora);
      osc1.stop(agora + 0.35);

      // 2º Tom - Lá 5 (880.00 Hz)
      const osc2 = ctx.createOscillator();
      const ganho2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, agora + 0.2);
      ganho2.gain.setValueAtTime(0.001, agora);
      ganho2.gain.setValueAtTime(0.3, agora + 0.2);
      ganho2.gain.exponentialRampToValueAtTime(0.0001, agora + 0.85);

      osc2.connect(ganho2);
      ganho2.connect(ctx.destination);
      osc2.start(agora + 0.2);
      osc2.stop(agora + 0.85);

      setTimeout(resolve, 850);
    } catch (err) {
      console.warn('[Audio] Falha na reprodução do gongo:', err);
      resolve();
    }
  });
}

/**
 * Carrega e decodifica o arquivo de áudio de uma palavra, letra ou número.
 * @param {string} nomeArquivo - Nome base do arquivo em /audio/{nomeArquivo}.mp3
 */
async function obterAudioBuffer(nomeArquivo) {
  const chave = String(nomeArquivo).toLowerCase().trim();
  if (cacheBuffersAudio.has(chave)) {
    return cacheBuffersAudio.get(chave);
  }

  const ctx = obterContextoAudio();
  if (!ctx) return null;

  try {
    const resposta = await fetch(`/audio/${chave}.mp3`);
    if (!resposta.ok) {
      console.warn(`[Audio] Arquivo /audio/${chave}.mp3 não encontrado.`);
      return null;
    }

    const arrayBuffer = await resposta.arrayBuffer();
    const bufferDecodificado = await ctx.decodeAudioData(arrayBuffer);
    cacheBuffersAudio.set(chave, bufferDecodificado);
    return bufferDecodificado;
  } catch (erro) {
    console.warn(`[Audio] Erro ao carregar/decodificar áudio de ${chave}:`, erro);
    return null;
  }
}

/**
 * Reproduz um fragmento de áudio via AudioContext e aguarda seu término.
 * Possui fallback automático para o elemento HTML5 Audio.
 */
function reproduzirClip(nomeArquivo) {
  return new Promise(async (resolve) => {
    const chave = String(nomeArquivo).toLowerCase().trim();
    const ctx = obterContextoAudio();

    if (ctx && ctx.state === 'running') {
      const buffer = await obterAudioBuffer(chave);
      if (buffer) {
        try {
          const fonte = ctx.createBufferSource();
          fonte.buffer = buffer;
          fonte.connect(ctx.destination);
          fonte.onended = () => resolve();
          fonte.start(0);
          return;
        } catch (erroFonte) {
          console.warn(`[Audio] Erro ao iniciar buffer ${chave}:`, erroFonte);
        }
      }
    }

    // Fallback via HTMLAudioElement
    try {
      const elementoAudio = new Audio(`/audio/${chave}.mp3`);
      elementoAudio.onended = () => resolve();
      elementoAudio.onerror = () => resolve();
      elementoAudio.play().catch(() => resolve());
    } catch {
      resolve();
    }
  });
}

/**
 * Decompõe a senha e o guichê em uma lista sequencial de chaves de áudio.
 * Exemplo: código "D001" e guichê "02" -> ['senha', 'd', '0', '0', '1', 'guiche', '0', '2']
 */
export function decomporSequenciaChamada(codigoFormatado, guicheNumero) {
  const sequencia = [];
  if (!codigoFormatado) return sequencia;

  sequencia.push('senha');

  const codigoLimpo = String(codigoFormatado).trim().toUpperCase();
  const correspondencia = codigoLimpo.match(/^([A-ZÀ-ÿ]+)(\d+)$/);

  if (correspondencia) {
    const [, letras, digitos] = correspondencia;
    // Adiciona cada letra
    for (const letra of letras) {
      sequencia.push(letra.toLowerCase());
    }
    // Adiciona cada dígito da senha individualmente
    for (const digito of digitos) {
      sequencia.push(digito);
    }
  } else {
    for (const char of codigoLimpo) {
      if (/[A-Z]/.test(char)) {
        sequencia.push(char.toLowerCase());
      } else if (/\d/.test(char)) {
        sequencia.push(char);
      }
    }
  }

  // Seção do Guichê
  sequencia.push('guiche');

  const guicheNormalizado = String(guicheNumero || '01').padStart(2, '0');
  for (const digitoGuiche of guicheNormalizado) {
    sequencia.push(digitoGuiche);
  }

  return sequencia;
}

/**
 * Anuncia a chamada da senha na TV com gongo seguido de voz gravada estilo Correios.
 * Reproduz a letra, pequena pausa e então cada número um por um.
 * @param {string} codigoFormatado - Código da senha (ex: "D001").
 * @param {string|number} guicheNumero - Número do guichê (ex: "02").
 */
export async function anunciarChamada(codigoFormatado, guicheNumero) {
  if (!audioHabilitado) return;

  await inicializarContextoAudio();

  // 1. Toca o gongo bimodal de chamada
  await tocarGongoChamada();

  // Pequena pausa respeitosa de 300ms após o gongo
  await aguardar(300);

  // 2. Decompõe a chamada em fragmentos
  const sequencia = decomporSequenciaChamada(codigoFormatado, guicheNumero);

  // 3. Reproduz sequencialmente cada fragmento com pausas calibradas
  for (let indice = 0; indice < sequencia.length; indice++) {
    const item = sequencia[indice];
    await reproduzirClip(item);

    // Pausas entre palavras no padrão dos Correios:
    if (item === 'senha') {
      await aguardar(200);
    } else if (item === 'guiche') {
      await aguardar(200);
    } else if (/[a-z]/.test(item)) {
      // Pausa após a letra antes de começar os números da senha
      await aguardar(220);
    } else {
      // Pausa entre dígitos individuais
      await aguardar(140);
    }
  }
}
