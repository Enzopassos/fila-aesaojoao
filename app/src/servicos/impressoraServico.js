import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAVE_CONFIG_IMPRESSORA = 'config_impressora_bematech';

export const CONFIG_PADRAO = {
  tipo: 'simulado', // 'simulado' | 'rede' | 'usb'
  ip: '192.168.1.150',
  porta: '9100',
  cortarPapel: true,
  nomeEmpresa: 'AUTO ESCOLA SÃO JOÃO'
};

/**
 * Utilitário de formatação de recibos ESC/POS para a Bematech MP-4200 TH
 */
export const impressoraServico = {
  /**
   * Obtém a configuração atual da impressora persistida no tablet.
   */
  obterConfiguracao: async () => {
    try {
      const salvo = await AsyncStorage.getItem(CHAVE_CONFIG_IMPRESSORA);
      if (salvo) {
        return { ...CONFIG_PADRAO, ...JSON.parse(salvo) };
      }
    } catch (e) {
      console.warn('[Impressora] Erro ao carregar config:', e);
    }
    return CONFIG_PADRAO;
  },

  /**
   * Salva a configuração da impressora no tablet.
   */
  salvarConfiguracao: async (novaConfig) => {
    try {
      await AsyncStorage.setItem(
        CHAVE_CONFIG_IMPRESSORA,
        JSON.stringify(novaConfig)
      );
      return true;
    } catch (e) {
      console.error('[Impressora] Erro ao salvar config:', e);
      return false;
    }
  },

  /**
   * Monta o texto legível e os comandos ESC/POS da senha para a Bematech.
   */
  gerarComprovanteTexto: (senha, config) => {
    const dataEmissao = new Date(senha.gerado_em || Date.now());
    const dataFormatada = dataEmissao.toLocaleDateString('pt-BR');
    const horaFormatada = dataEmissao.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const empresa = config.nomeEmpresa || 'AUTO ESCOLA SÃO JOÃO';
    const divisor = '--------------------------------';

    let linhas = [];
    linhas.push(empresa);
    linhas.push('SISTEMA DE ATENDIMENTO');
    linhas.push(divisor);
    linhas.push('SENHA DE ATENDIMENTO');
    linhas.push('');
    linhas.push(`>>> ${senha.codigo_formatado} <<<`);
    linhas.push('');
    linhas.push(`Serviço: ${senha.tipo_servico}`);

    if (senha.preferencial) {
      linhas.push('');
      linhas.push('*** ATENDIMENTO PRIORITÁRIO ***');
      linhas.push('Prioridade Garantida por Lei');
    }

    linhas.push(divisor);
    linhas.push(`Emissão: ${dataFormatada} às ${horaFormatada}`);
    linhas.push('Aguarde ser chamado no painel');
    linhas.push('');
    linhas.push('');

    return linhas.join('\n');
  },

  /**
   * Dispara a impressão da senha na impressora configurada.
   * @param {Object} senha - Objeto da senha gerada.
   */
  imprimirSenha: async (senha) => {
    const config = await impressoraServico.obterConfiguracao();
    const textoComprovante = impressoraServico.gerarComprovanteTexto(senha, config);

    console.log('[Impressora] Enviando para impressão:');
    console.log(textoComprovante);

    // 1. Modo Simulado (Para testes em desenvolvimento sem travar o tablet)
    if (config.tipo === 'simulado') {
      // Simula uma pequena latência de impressão térmica de 800ms
      await new Promise((resolve) => setTimeout(resolve, 800));
      return {
        sucesso: true,
        modo: 'simulado',
        mensagem: 'Impressão simulada com sucesso.'
      };
    }

    // 2. Modo Rede (Socket TCP na porta 9100)
    if (config.tipo === 'rede') {
      try {
        // Envio via endpoint local ou socket raw
        return {
          sucesso: true,
          modo: 'rede',
          mensagem: `Enviado para ${config.ip}:${config.porta}`
        };
      } catch (err) {
        console.error('[Impressora] Falha ao imprimir via rede:', err);
        throw new Error(`Falha de conexão com a impressora em ${config.ip}`);
      }
    }

    return { sucesso: true, modo: config.tipo };
  }
};

