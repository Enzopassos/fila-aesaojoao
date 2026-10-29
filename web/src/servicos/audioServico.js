/**
 * Serviço de Áudio e Chamada de Fila (Padrão Correios / Alta Compatibilidade)
 * Utiliza o Web Audio API com amostras gravadas de voz feminina em português,
 * garantindo funcionamento idêntico e consistente em qualquer sistema operacional
 * (Linux, Smart TVs, Android, Windows, Mac), sem depender de pacotes TTS externos.
 */

let contextoAudio = null;
let audioHabilitado = true;
const cacheBuffersAudio = new Map();
let anuncioAtualId = 0;

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
 * Decodifica o ArrayBuffer de áudio garantindo compatibilidade universal com
 * navegadores modernos (baseados em Promise) e legados/Smart TVs (baseados em Callbacks).
 * Inclui timeout de proteção para evitar congelamento caso a TV falhe silenciosamente.
 */
function decodificarAudioCompativel(ctx, arrayBuffer) {
  return new Promise((resolve, reject) => {
    let finalizado = false;
    const copiaBuffer = arrayBuffer.slice(0);

    // Timeout de 1500ms: impede que motores de Smart TV travem a Promise em silêncio
    const timerLimite = setTimeout(() => {
      if (!finalizado) {
        finalizado = true;
        reject(new Error('Timeout na decodificação de áudio'));
      }
    }, 1500);

    const concluirSucesso = (bufferDecodificado) => {
      if (!finalizado) {
        finalizado = true;
        clearTimeout(timerLimite);
        resolve(bufferDecodificado);
      }
    };

    const concluirErro = (erro) => {
      if (!finalizado) {
        finalizado = true;
        clearTimeout(timerLimite);
        reject(erro || new Error('Falha ao decodificar áudio'));
      }
    };

    try {
      const promessaOuVazio = ctx.decodeAudioData(
        copiaBuffer,
        concluirSucesso,
        concluirErro
      );

      // Suporte a navegadores que retornam Promise mesmo com callbacks informados
      if (promessaOuVazio && typeof promessaOuVazio.then === 'function') {
        promessaOuVazio.then(concluirSucesso).catch(concluirErro);
      }
    } catch (erroSincrono) {
      concluirErro(erroSincrono);
    }
  });
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
 * Pré-carrega os áudios essenciais na memória para eliminar latência durante as chamadas.
 */
export async function preCarregarAudiosEssenciais() {
  const chavesBasicas = [
    'senha', 'guiche',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    'a', 'b', 'c', 'd', 'e', 'p', 's'
  ];

  try {
    await Promise.all(chavesBasicas.map((chave) => obterAudioBuffer(chave)));
  } catch (e) {
    console.warn('[Audio] Falha parcial no pré-carregamento dos áudios:', e);
  }
}

/**
 * Mantido por compatibilidade de interface.
 */
export async function carregarVozesDisponiveis() {
  await preCarregarAudiosEssenciais();
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

let elementoAudioSingleton = null;

/**
 * Obtém ou cria a instância única de elemento <audio> anexada ao DOM da página.
 * Obrigatório para Smart TVs (como Samsung Tizen), onde elementos criados soltos
 * na memória são bloqueados pelo subsistema de mídia de hardware.
 */
function obterElementoAudioSingleton() {
  if (!elementoAudioSingleton && typeof document !== 'undefined') {
    elementoAudioSingleton = document.getElementById('reprodutor-audio-tv-singleton');
    if (!elementoAudioSingleton) {
      elementoAudioSingleton = document.createElement('audio');
      elementoAudioSingleton.id = 'reprodutor-audio-tv-singleton';
      elementoAudioSingleton.preload = 'auto';
      elementoAudioSingleton.style.position = 'fixed';
      elementoAudioSingleton.style.top = '-9999px';
      elementoAudioSingleton.style.left = '-9999px';
      elementoAudioSingleton.style.width = '1px';
      elementoAudioSingleton.style.height = '1px';
      elementoAudioSingleton.style.opacity = '0';
      elementoAudioSingleton.style.pointerEvents = 'none';
      document.body.appendChild(elementoAudioSingleton);
    }
  }
  return elementoAudioSingleton;
}

/**
 * Reproduz um fragmento de áudio via o reprodutor nativo HTML5 Singleton do DOM.
 * Utilizado como fallback à prova de falhas em Smart TVs.
 */
function reproduzirViaElementoNativo(chave) {
  return new Promise((resolve) => {
    const el = obterElementoAudioSingleton();
    if (!el) {
      resolve();
      return;
    }

    let finalizado = false;
    let timerSeguranca = null;

    const concluir = () => {
      if (!finalizado) {
        finalizado = true;
        if (timerSeguranca) clearTimeout(timerSeguranca);
        el.onended = null;
        el.onerror = null;
        resolve();
      }
    };

    el.onended = concluir;
    el.onerror = concluir;
    timerSeguranca = setTimeout(concluir, 2200);

    try {
      // Tenta WAV primeiro (PCM sem codec), com fallback para MP3
      el.src = `/audio/${chave}.wav`;
      el.load();
      const promessaPlay = el.play();
      if (promessaPlay && typeof promessaPlay.catch === 'function') {
        promessaPlay.catch(() => {
          try {
            el.src = `/audio/${chave}.mp3`;
            el.load();
            const p2 = el.play();
            if (p2 && typeof p2.catch === 'function') {
              p2.catch(concluir);
            }
          } catch {
            concluir();
          }
        });
      }
    } catch {
      concluir();
    }
  });
}

/**
 * Carrega e decodifica o arquivo de áudio de uma palavra, letra ou número.
 * Tenta primeiro WAV (PCM 16-bit nativo universal em Smart TVs / Tizen, sem necessidade de codec),
 * e depois MP3 como alternativa.
 * @param {string} nomeArquivo - Nome base do arquivo
 */
async function obterAudioBuffer(nomeArquivo) {
  const chave = String(nomeArquivo).toLowerCase().trim();
  if (cacheBuffersAudio.has(chave)) {
    return cacheBuffersAudio.get(chave);
  }

  const ctx = obterContextoAudio();
  if (!ctx) return null;

  // WAV é formato PCM puro universal (sem codecs proprietários, 100% suportado pelo Web Audio de Smart TVs)
  const formatos = ['wav', 'mp3'];

  for (const formato of formatos) {
    try {
      const resposta = await fetch(`/audio/${chave}.${formato}`);
      if (!resposta.ok) continue;

      const tipoConteudo = resposta.headers.get('content-type') || '';
      if (tipoConteudo.includes('text/html')) continue;

      const arrayBuffer = await resposta.arrayBuffer();
      const bufferDecodificado = await decodificarAudioCompativel(ctx, arrayBuffer);
      if (bufferDecodificado) {
        cacheBuffersAudio.set(chave, bufferDecodificado);
        return bufferDecodificado;
      }
    } catch (erro) {
      console.warn(`[Audio] Falha ao carregar/decodificar ${chave}.${formato}:`, erro);
    }
  }

  return null;
}

/**
 * Reproduz um fragmento de áudio via AudioContext e aguarda seu término.
 * Possui fallback defensivo para o Reprodutor Singleton HTML5 conectado ao DOM em Smart TVs.
 */
function reproduzirClip(nomeArquivo, idExecucao) {
  return new Promise(async (resolve) => {
    if (idExecucao && idExecucao !== anuncioAtualId) {
      resolve();
      return;
    }

    const chave = String(nomeArquivo).toLowerCase().trim();
    const ctx = obterContextoAudio();

    if (ctx && ctx.state === 'running') {
      const buffer = await obterAudioBuffer(chave);
      if (idExecucao && idExecucao !== anuncioAtualId) {
        resolve();
        return;
      }

      if (buffer) {
        try {
          const fonte = ctx.createBufferSource();
          fonte.buffer = buffer;
          fonte.connect(ctx.destination);

          let finalizado = false;
          const concluir = () => {
            if (!finalizado) {
              finalizado = true;
              resolve();
            }
          };

          fonte.onended = concluir;

          // Timeout de salvaguarda caso o evento onended falhe no navegador da TV
          const duracaoMs = Math.ceil((buffer.duration || 1) * 1000) + 80;
          setTimeout(concluir, duracaoMs);

          if (typeof fonte.start === 'function') {
            fonte.start(0);
          } else if (typeof fonte.noteOn === 'function') {
            fonte.noteOn(0);
          } else {
            concluir();
          }
          return;
        } catch (erroFonte) {
          console.warn(`[Audio] Erro ao iniciar buffer ${chave}:`, erroFonte);
        }
      }
    }

    // Fallback à prova de falhas: elemento <audio> singleton anexado ao DOM (requisito Samsung Tizen)
    if (idExecucao && idExecucao !== anuncioAtualId) {
      resolve();
      return;
    }
    await reproduzirViaElementoNativo(chave);
    resolve();
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
 * Anuncia a chamada da senha na TV com gongo seguido de voz gravada feminina estilo Correios.
 * Impede sobreposição de áudios concorrentes via token de execução unívoco.
 * @param {string} codigoFormatado - Código da senha (ex: "D001").
 * @param {string|number} guicheNumero - Número do guichê (ex: "02").
 */
export async function anunciarChamada(codigoFormatado, guicheNumero) {
  if (!audioHabilitado) return;

  const idExecucao = ++anuncioAtualId;

  await inicializarContextoAudio();

  // 1. Toca o gongo bimodal de chamada
  await tocarGongoChamada();

  if (idExecucao !== anuncioAtualId) return;

  // Pequena pausa respeitosa de 300ms após o gongo
  await aguardar(300);

  if (idExecucao !== anuncioAtualId) return;

  // 2. Decompõe a chamada em fragmentos
  const sequencia = decomporSequenciaChamada(codigoFormatado, guicheNumero);

  // 3. Reproduz sequencialmente cada fragmento com pausas calibradas
  for (let indice = 0; indice < sequencia.length; indice++) {
    if (idExecucao !== anuncioAtualId) return;

    const item = sequencia[indice];
    await reproduzirClip(item, idExecucao);

    if (idExecucao !== anuncioAtualId) return;

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
