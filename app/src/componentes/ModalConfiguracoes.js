import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { impressoraServico, CONFIG_PADRAO } from '../servicos/impressoraServico';

export function ModalConfiguracoes({ visivel, aoFechar }) {
  const [pin, setPin] = useState('');
  const [autenticado, setAutenticado] = useState(false);
  const [config, setConfig] = useState(CONFIG_PADRAO);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (visivel) {
      setPin('');
      setAutenticado(false);
      carregarConfig();
    }
  }, [visivel]);

  async function carregarConfig() {
    const dados = await impressoraServico.obterConfiguracao();
    setConfig(dados);
  }

  function handleVerificarPin() {
    // PIN padrão de manutenção: 1234
    if (pin.trim() === '1234') {
      setAutenticado(true);
    } else {
      Alert.alert('Acesso Negado', 'PIN de manutenção incorreto.');
    }
  }

  async function handleSalvar() {
    setSalvando(true);
    try {
      await impressoraServico.salvarConfiguracao(config);
      Alert.alert('Sucesso', 'Configurações da impressora salvas.');
      aoFechar();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar as configurações.');
    } finally {
      setSalvando(false);
    }
  }

  async function handleTestarImpressao() {
    try {
      await impressoraServico.imprimirSenha({
        codigo_formatado: 'T999',
        tipo_servico: 'TESTE DE IMPRESSÃO',
        preferencial: false,
        gerado_em: new Date().toISOString()
      });
      Alert.alert('Impressão Enviada', 'Comprovante de teste disparado com sucesso.');
    } catch (err) {
      Alert.alert('Falha na Impressão', err?.message || 'Erro ao comunicar com a impressora.');
    }
  }

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={aoFechar}>
      <View style={estilos.fundoModal}>
        <View style={estilos.cartaoModal}>
          <View style={estilos.cabecalhoModal}>
            <View style={estilos.linhaTitulo}>
              <MaterialCommunityIcons name="printer-settings" size={24} color="#0f172a" />
              <Text style={estilos.tituloModal}>Configuração da Impressora</Text>
            </View>
            <TouchableOpacity onPress={aoFechar} style={estilos.botaoFechar}>
              <MaterialCommunityIcons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          {!autenticado ? (
            <View style={estilos.conteudoPin}>
              <Text style={estilos.rotuloPin}>Digite o PIN de Manutenção:</Text>
              <TextInput
                style={estilos.inputPin}
                secureTextEntry
                keyboardType="numeric"
                maxLength={6}
                value={pin}
                onChangeText={setPin}
                placeholder="****"
                placeholderTextColor="#94a3b8"
                autoFocus
              />
              <TouchableOpacity style={estilos.botaoAcessar} onPress={handleVerificarPin}>
                <Text style={estilos.textoBotaoAcessar}>Acessar Configurações</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={estilos.corpoFormulario}>
              <Text style={estilos.rotuloCampo}>Modo de Operação:</Text>
              <View style={estilos.gradeModos}>
                <TouchableOpacity
                  style={[
                    estilos.botaoModo,
                    config.tipo === 'simulado' && estilos.botaoModoAtivo
                  ]}
                  onPress={() => setConfig({ ...config, tipo: 'simulado' })}
                >
                  <Text
                    style={[
                      estilos.textoModo,
                      config.tipo === 'simulado' && estilos.textoModoAtivo
                    ]}
                  >
                    Simulado
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    estilos.botaoModo,
                    config.tipo === 'rede' && estilos.botaoModoAtivo
                  ]}
                  onPress={() => setConfig({ ...config, tipo: 'rede' })}
                >
                  <Text
                    style={[
                      estilos.textoModo,
                      config.tipo === 'rede' && estilos.textoModoAtivo
                    ]}
                  >
                    Rede (TCP)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    estilos.botaoModo,
                    config.tipo === 'usb' && estilos.botaoModoAtivo
                  ]}
                  onPress={() => setConfig({ ...config, tipo: 'usb' })}
                >
                  <Text
                    style={[
                      estilos.textoModo,
                      config.tipo === 'usb' && estilos.textoModoAtivo
                    ]}
                  >
                    Cabo USB
                  </Text>
                </TouchableOpacity>
              </View>

              {config.tipo === 'rede' && (
                <>
                  <Text style={estilos.rotuloCampo}>Endereço IP da Bematech:</Text>
                  <TextInput
                    style={estilos.input}
                    value={config.ip}
                    onChangeText={(txt) => setConfig({ ...config, ip: txt })}
                    placeholder="192.168.1.150"
                    keyboardType="numeric"
                  />

                  <Text style={estilos.rotuloCampo}>Porta TCP:</Text>
                  <TextInput
                    style={estilos.input}
                    value={config.porta}
                    onChangeText={(txt) => setConfig({ ...config, porta: txt })}
                    placeholder="9100"
                    keyboardType="numeric"
                  />
                </>
              )}

              <View style={estilos.linhaAcoes}>
                <TouchableOpacity
                  style={estilos.botaoTestar}
                  onPress={handleTestarImpressao}
                >
                  <MaterialCommunityIcons name="printer" size={18} color="#2563eb" />
                  <Text style={estilos.textoBotaoTestar}>Testar Impressão</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={estilos.botaoSalvar}
                  onPress={handleSalvar}
                  disabled={salvando}
                >
                  <Text style={estilos.textoBotaoSalvar}>
                    {salvando ? 'Salvando...' : 'Salvar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fundoModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  cartaoModal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8
  },
  cabecalhoModal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 12
  },
  linhaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  tituloModal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a'
  },
  botaoFechar: {
    padding: 4
  },
  conteudoPin: {
    alignItems: 'center',
    paddingVertical: 16
  },
  rotuloPin: {
    fontSize: 16,
    color: '#334155',
    marginBottom: 12,
    fontWeight: '500'
  },
  inputPin: {
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    width: 160,
    height: 52,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 20,
    color: '#0f172a'
  },
  botaoAcessar: {
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8
  },
  textoBotaoAcessar: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15
  },
  corpoFormulario: {
    paddingVertical: 8
  },
  rotuloCampo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10
  },
  gradeModos: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14
  },
  botaoModo: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center'
  },
  botaoModoAtivo: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff'
  },
  textoModo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b'
  },
  textoModoAtivo: {
    color: '#2563eb'
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
    marginBottom: 6
  },
  linhaAcoes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24
  },
  botaoTestar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 8
  },
  textoBotaoTestar: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 14
  },
  botaoSalvar: {
    backgroundColor: '#059669',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 8
  },
  textoBotaoSalvar: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14
  }
});

