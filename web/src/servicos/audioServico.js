/**
 * Serviço de Áudio e Chamada de Fila (Padrão Correios / Alta Compatibilidade)
 * Utiliza o Web Audio API com amostras gravadas de voz feminina em português,
 * garantindo funcionamento idêntico e consistente em qualquer sistema operacional
 * (Linux, Smart TVs Samsung Tizen 2019-2022, Android, Windows, Mac), sem depender de pacotes TTS externos.
 */

let contextoAudio = null;
let audioHabilitado = true;
const cacheBuffersAudio = new Map();
let anuncioAtualId = 0;
const ouvintesDiagnostico = new Set();

export const TODAS_AS_CHAVES_AUDIO = [
  'senha', 'guiche',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
  'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
  'u', 'v', 'w', 'x', 'y', 'z'
];

/**
 * Inscreve um ouvinte para receber mensagens de diagnóstico de áudio em tempo real.
 */
export function inscreverDiagnosticoAudio(callback) {
  ouvintesDiagnostico.add(callback);
  return () => ouvintesDiagnostico.delete(callback);
}

function notificarDiagnostico(mensagem, nivel = 'info') {
  if (nivel === 'erro') {
    console.error(`[AudioTv] ${mensagem}`);
  }
}

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
 * Decodifica diretamente dados PCM de um arquivo WAV canônico (16-bit LE, 48kHz mono)
 * diretamente para um AudioBuffer usando pura aritmética em JavaScript.
 * Bypassa 100% dos decodificadores de hardware/SO do Tizen, eliminando congelamentos
 * e erros de decodeAudioData em Smart TVs antigas.
 */
function decodificarWavPuro(ctx, arrayBuffer) {
  try {
    const visualizador = new DataView(arrayBuffer);
    if (visualizador.byteLength < 44) return null;

    const riff = String.fromCharCode(
      visualizador.getUint8(0), visualizador.getUint8(1),
      visualizador.getUint8(2), visualizador.getUint8(3)
    );
    const wave = String.fromCharCode(
      visualizador.getUint8(8), visualizador.getUint8(9),
      visualizador.getUint8(10), visualizador.getUint8(11)
    );
    if (riff !== 'RIFF' || wave !== 'WAVE') return null;

    let deslocamento = 12;
    let canais = 1;
    let taxaAmostragem = 48000;
    let bitsPorAmostra = 16;
    let deslocamentoDados = -1;
    let tamanhoDados = 0;

    while (deslocamento < visualizador.byteLength - 8) {
      const idChunk = String.fromCharCode(
        visualizador.getUint8(deslocamento), visualizador.getUint8(deslocamento + 1),
        visualizador.getUint8(deslocamento + 2), visualizador.getUint8(deslocamento + 3)
      );
      const tamanhoChunk = visualizador.getUint32(deslocamento + 4, true);

      if (idChunk === 'fmt ') {
        canais = visualizador.getUint16(deslocamento + 10, true);
        taxaAmostragem = visualizador.getUint32(deslocamento + 12, true);
        bitsPorAmostra = visualizador.getUint16(deslocamento + 22, true);
      } else if (idChunk === 'data') {
        deslocamentoDados = deslocamento + 8;
        tamanhoDados = tamanhoChunk;
        break;
      }
      deslocamento += 8 + tamanhoChunk;
    }

    if (deslocamentoDados === -1 || bitsPorAmostra !== 16 || canais < 1) return null;

    const totalAmostras = Math.floor(tamanhoDados / (2 * canais));
    const bufferAudio = ctx.createBuffer(canais, totalAmostras, taxaAmostragem);

    for (let c = 0; c < canais; c++) {
      const canalDados = bufferAudio.getChannelData(c);
      let indiceByte = deslocamentoDados + (c * 2);
      for (let i = 0; i < totalAmostras; i++) {
        canalDados[i] = visualizador.getInt16(indiceByte, true) / 32768.0;
        indiceByte += 2 * canais;
      }
    }

    return bufferAudio;
  } catch (err) {
    console.warn('[Audio] Falha no decodificador PCM puro:', err);
    return null;
  }
}

/**
 * Fallback padrão usando ctx.decodeAudioData para arquivos MP3.
 */
function decodificarAudioNativo(ctx, arrayBuffer) {
  return new Promise((resolve) => {
    let finalizado = false;
    const copiaBuffer = arrayBuffer.slice(0);

    const timer = setTimeout(() => {
      if (!finalizado) {
        finalizado = true;
        resolve(null);
      }
    }, 1200);

    const concluirSucesso = (buffer) => {
      if (!finalizado) {
        finalizado = true;
        clearTimeout(timer);
        resolve(buffer);
      }
    };

    const concluirErro = () => {
      if (!finalizado) {
        finalizado = true;
        clearTimeout(timer);
        resolve(null);
      }
    };

    try {
      const promessa = ctx.decodeAudioData(copiaBuffer, concluirSucesso, concluirErro);
      if (promessa && typeof promessa.then === 'function') {
        promessa.then(concluirSucesso).catch(concluirErro);
      }
    } catch {
      concluirErro();
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
    const ativo = Boolean(ctx && ctx.state === 'running');
    notificarDiagnostico(`AudioContext: ${ctx?.state || 'inativo'} (${ctx?.sampleRate || 0} Hz)`, ativo ? 'sucesso' : 'aviso');
    return ativo;
  } catch (e) {
    notificarDiagnostico(`Erro ao inicializar AudioContext: ${e.message}`, 'erro');
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

export function obterEstatisticasAudio() {
  const ctx = obterContextoAudio();
  return {
    estado: ctx?.state || 'inativo',
    taxaAmostragem: ctx?.sampleRate || 0,
    totalEmMemoria: cacheBuffersAudio.size,
    totalDisponivel: TODAS_AS_CHAVES_AUDIO.length
  };
}

/**
 * Carrega e decodifica o arquivo de áudio de uma palavra, letra ou número.
 * Prioridade 1: WAV PCM 48kHz decodificado matematicamente em JavaScript puro (zero dependência de SO/codecs).
 * Prioridade 2: WAV decodificado nativamente via Web Audio.
 * Prioridade 3: MP3 decodificado nativamente.
 */
async function obterAudioBuffer(nomeArquivo) {
  const chave = String(nomeArquivo).toLowerCase().trim();
  if (cacheBuffersAudio.has(chave)) {
    return cacheBuffersAudio.get(chave);
  }

  const ctx = obterContextoAudio();
  if (!ctx) return null;

  // 1. Tenta carregar WAV canônico e decodificar via aritmética JS pura (100% seguro em Smart TVs)
  try {
    const urlWav = `/audio/${chave}.wav`;
    const respostaWav = await fetch(urlWav);
    if (respostaWav.ok) {
      const tipo = respostaWav.headers.get('content-type') || '';
      if (!tipo.includes('text/html')) {
        const arrayBuffer = await respostaWav.arrayBuffer();
        
        // Decodificação matemática direta do PCM (ignora codecs do SO)
        const bufferPuro = decodificarWavPuro(ctx, arrayBuffer);
        if (bufferPuro) {
          cacheBuffersAudio.set(chave, bufferPuro);
          return bufferPuro;
        }

        // Se falhar o parser puro, tenta a decodificação nativa do browser
        const bufferNativo = await decodificarAudioNativo(ctx, arrayBuffer);
        if (bufferNativo) {
          cacheBuffersAudio.set(chave, bufferNativo);
          return bufferNativo;
        }
      }
    }
  } catch (erroWav) {
    console.warn(`[Audio] Erro ao carregar WAV ${chave}:`, erroWav);
  }

  // 2. Fallback para MP3 comprimido
  try {
    const urlMp3 = `/audio/${chave}.mp3`;
    const respostaMp3 = await fetch(urlMp3);
    if (respostaMp3.ok) {
      const tipo = respostaMp3.headers.get('content-type') || '';
      if (!tipo.includes('text/html')) {
        const arrayBufferMp3 = await respostaMp3.arrayBuffer();
        const bufferMp3 = await decodificarAudioNativo(ctx, arrayBufferMp3);
        if (bufferMp3) {
          cacheBuffersAudio.set(chave, bufferMp3);
          return bufferMp3;
        }
      }
    }
  } catch (erroMp3) {
    console.warn(`[Audio] Erro ao carregar MP3 ${chave}:`, erroMp3);
  }

  return null;
}

/**
 * Pré-carrega todos os áudios na memória RAM para eliminar atrasos durante chamadas.
 */
export async function preCarregarTodosAudios() {
  const ctx = obterContextoAudio();
  if (!ctx) return 0;

  notificarDiagnostico(`Pré-carregando ${TODAS_AS_CHAVES_AUDIO.length} clips de áudio na memória...`);
  let carregados = 0;

  await Promise.all(
    TODAS_AS_CHAVES_AUDIO.map(async (chave) => {
      try {
        const buf = await obterAudioBuffer(chave);
        if (buf) carregados++;
      } catch {}
    })
  );

  notificarDiagnostico(
    `Memória de áudio: ${carregados}/${TODAS_AS_CHAVES_AUDIO.length} clips prontos`,
    carregados >= 30 ? 'sucesso' : 'aviso'
  );
  return carregados;
}

export const preCarregarAudiosEssenciais = preCarregarTodosAudios;

/**
 * Toca o gongo bimodal harmônico (D5 -> A5) gerado matematicamente via osciladores senoidais.
 * Funciona de forma 100% nativa sem dependência de arquivos externos.
 */
export function tocarGongoChamada() {
  return new Promise(async (resolve) => {
    try {
      notificarDiagnostico('Iniciando gongo...');
      const ctx = obterContextoAudio();
      if (!ctx) {
        notificarDiagnostico('Gongo cancelado: Contexto ausente', 'erro');
        resolve();
        return;
      }

      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {}
      }

      if (ctx.state !== 'running') {
        notificarDiagnostico(`Gongo abortado: Contexto em estado ${ctx.state}`, 'aviso');
        resolve();
        return;
      }

      const agora = ctx.currentTime;

      // 1ª Nota: Ré 5 (D5 ~ 587.33 Hz)
      const osc1 = ctx.createOscillator();
      const ganho1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, agora);
      ganho1.gain.setValueAtTime(0.001, agora);
      ganho1.gain.exponentialRampToValueAtTime(0.35, agora + 0.04);
      ganho1.gain.exponentialRampToValueAtTime(0.0001, agora + 0.75);
      osc1.connect(ganho1);
      ganho1.connect(ctx.destination);
      osc1.start(agora);
      osc1.stop(agora + 0.75);

      // 2ª Nota: Lá 5 (A5 ~ 880.00 Hz)
      const osc2 = ctx.createOscillator();
      const ganho2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, agora + 0.2);
      ganho2.gain.setValueAtTime(0.001, agora + 0.2);
      ganho2.gain.exponentialRampToValueAtTime(0.38, agora + 0.24);
      ganho2.gain.exponentialRampToValueAtTime(0.0001, agora + 0.85);
      osc2.connect(ganho2);
      ganho2.connect(ctx.destination);
      osc2.start(agora + 0.2);
      osc2.stop(agora + 0.85);

      notificarDiagnostico('Gongo sintetizado OK (D5 + A5)', 'sucesso');
      setTimeout(resolve, 850);
    } catch (err) {
      notificarDiagnostico(`Falha no gongo: ${err.message}`, 'erro');
      resolve();
    }
  });
}

let elementoAudioSingleton = null;

function obterElementoAudioSingleton() {
  if (!elementoAudioSingleton && typeof document !== 'undefined') {
    elementoAudioSingleton = document.getElementById('reprodutor-audio-tv-singleton');
    if (!elementoAudioSingleton) {
      elementoAudioSingleton = document.createElement('audio');
      elementoAudioSingleton.id = 'reprodutor-audio-tv-singleton';
      elementoAudioSingleton.preload = 'auto';
      // Elemento posicionado com visibilidade no DOM para evitar políticas de suspensão de mídia do Tizen
      elementoAudioSingleton.style.position = 'fixed';
      elementoAudioSingleton.style.bottom = '0px';
      elementoAudioSingleton.style.right = '0px';
      elementoAudioSingleton.style.width = '2px';
      elementoAudioSingleton.style.height = '2px';
      elementoAudioSingleton.style.opacity = '0.01';
      elementoAudioSingleton.style.pointerEvents = 'none';
      document.body.appendChild(elementoAudioSingleton);
    }
  }
  return elementoAudioSingleton;
}

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

    el.onended = () => {
      notificarDiagnostico(`HTML5 '${chave}' OK`, 'sucesso');
      concluir();
    };

    el.onerror = () => {
      notificarDiagnostico(`HTML5 '${chave}' erro`, 'erro');
      concluir();
    };

    timerSeguranca = setTimeout(() => {
      notificarDiagnostico(`HTML5 '${chave}' timeout`, 'aviso');
      concluir();
    }, 2200);

    try {
      el.src = `/audio/${chave}.wav`;
      el.load();
      const p = el.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
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
 * Reproduz um fragmento de áudio via AudioContext e aguarda seu término.
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

          // Roteamento via GainNode: obrigatório para TVs Samsung/Tizen passarem pelo mixer DSP
          const ganho = ctx.createGain();
          ganho.gain.setValueAtTime(1.0, ctx.currentTime);
          fonte.connect(ganho);
          ganho.connect(ctx.destination);

          // Referência global temporária: impede Garbage Collection prematuro mid-playback no Tizen
          if (typeof window !== 'undefined') {
            window.__fonteAtivaTv = fonte;
          }

          let finalizado = false;
          const concluir = () => {
            if (!finalizado) {
              finalizado = true;
              fonte.onended = null;
              if (typeof window !== 'undefined' && window.__fonteAtivaTv === fonte) {
                window.__fonteAtivaTv = null;
              }
              resolve();
            }
          };

          fonte.onended = concluir;

          // Timeout de salvaguarda caso o evento onended falhe no navegador da TV
          const duracaoMs = Math.ceil((buffer.duration || 1) * 1000) + 60;
          setTimeout(concluir, duracaoMs);

          // Início exato baseado no relógio do AudioContext (EVITA passar 0 no Tizen)
          const tempoInicio = ctx.currentTime;
          if (typeof fonte.start === 'function') {
            fonte.start(tempoInicio);
          } else if (typeof fonte.noteOn === 'function') {
            fonte.noteOn(tempoInicio);
          } else {
            concluir();
          }

          notificarDiagnostico(`Voz: '${chave}' (${buffer.duration.toFixed(2)}s)`);
          return;
        } catch (erroFonte) {
          notificarDiagnostico(`Erro BufferSource '${chave}': ${erroFonte.message}`, 'erro');
        }
      }
    }

    // Fallback para elemento HTML5 se o buffer falhar
    if (idExecucao && idExecucao !== anuncioAtualId) {
      resolve();
      return;
    }

    notificarDiagnostico(`Fallback HTML5: '${chave}'...`, 'aviso');
    await reproduzirViaElementoNativo(chave);
    resolve();
  });
}

function aguardar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Decompõe um código de senha e guichê em tokens fonéticos padronizados.
 */
export function decomporSequenciaChamada(codigoFormatado, guicheNumero) {
  const sequencia = [];
  sequencia.push('senha');

  const codigoLimpo = String(codigoFormatado || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  for (let i = 0; i < codigoLimpo.length; i++) {
    const char = codigoLimpo[i].toLowerCase();
    if (/[a-z0-9]/.test(char)) {
      sequencia.push(char);
    }
  }

  sequencia.push('guiche');

  const guicheTexto = String(guicheNumero || '01').trim();
  for (let i = 0; i < guicheTexto.length; i++) {
    const char = guicheTexto[i].toLowerCase();
    if (/[a-z0-9]/.test(char)) {
      sequencia.push(char);
    }
  }

  return sequencia;
}

/**
 * Executa o anúncio sonoro completo de uma chamada de senha.
 */
export async function anunciarChamada(codigoFormatado, guicheNumero) {
  if (!audioHabilitado) {
    notificarDiagnostico('Chamada ignorada: áudio desabilitado', 'aviso');
    return;
  }

  const idExecucao = ++anuncioAtualId;
  notificarDiagnostico(`Chamada #${idExecucao}: ${codigoFormatado} (Guichê ${guicheNumero})`);

  await inicializarContextoAudio();

  // 1. Toca o gongo bimodal de chamada
  await tocarGongoChamada();

  if (idExecucao !== anuncioAtualId) {
    notificarDiagnostico(`Chamada #${idExecucao} abortada (substituída)`, 'aviso');
    return;
  }

  // Pausa respeitosa de 320ms após o término do gongo
  await aguardar(320);

  if (idExecucao !== anuncioAtualId) return;

  // 2. Decompõe a chamada em fragmentos
  const sequencia = decomporSequenciaChamada(codigoFormatado, guicheNumero);
  notificarDiagnostico(`Fila de voz: [${sequencia.join(', ')}]`);

  // 3. Reproduz sequencialmente cada fragmento
  for (let indice = 0; indice < sequencia.length; indice++) {
    if (idExecucao !== anuncioAtualId) {
      notificarDiagnostico(`Chamada #${idExecucao} interrompida no fragmento ${indice}`, 'aviso');
      return;
    }

    const item = sequencia[indice];
    await reproduzirClip(item, idExecucao);

    // Pausas naturais entre palavras
    if (item === 'senha') {
      await aguardar(260);
    } else if (item === 'guiche') {
      await aguardar(240);
    } else {
      await aguardar(140);
    }
  }

  notificarDiagnostico(`Chamada #${idExecucao} finalizada com sucesso!`, 'sucesso');
}

export async function carregarVozesDisponiveis() {
  await preCarregarTodosAudios();
  return [];
}
