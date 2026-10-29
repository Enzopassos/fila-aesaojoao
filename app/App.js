import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  SafeAreaView,
  StatusBar,
  Modal
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { categoriaServico } from './src/servicos/categoriaServico';
import { filaServico } from './src/servicos/filaServico';
import { impressoraServico } from './src/servicos/impressoraServico';
import { ModalConfiguracoes } from './src/componentes/ModalConfiguracoes';

export default function App() {
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [horaAtual, setHoraAtual] = useState('');
  const [modalConfigAberto, setModalConfigAberto] = useState(false);

  // Estado do Feedback da Senha Impressa
  const [senhaEmitida, setSenhaEmitida] = useState(null);
  const timerLimpeza = useRef(null);

  // Relógio digital no topo
  useEffect(() => {
    function atualizarHora() {
      const agora = new Date();
      const horas = String(agora.getHours()).padStart(2, '0');
      const minutos = String(agora.getMinutes()).padStart(2, '0');
      setHoraAtual(`${horas}:${minutos}`);
    }
    atualizarHora();
    const intervalo = setInterval(atualizarHora, 1000);
    return () => clearInterval(intervalo);
  }, []);

  const carregarCategorias = useCallback(async () => {
    setCarregando(true);
    try {
      const dados = await categoriaServico.listarCategorias(true);
      setCategorias(dados || []);
    } catch (err) {
      console.error('[TotemApp] Erro ao buscar categorias:', err);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarCategorias();

    return () => {
      if (timerLimpeza.current) {
        clearTimeout(timerLimpeza.current);
      }
    };
  }, [carregarCategorias]);

  const handleEmitirSenha = async (categoria) => {
    if (processando) return;

    setProcessando(true);

    try {
      // 1. Registra no banco via Supabase (sincroniza em tempo real com atendente e TV)
      const novaSenha = await filaServico.gerarNovaSenha(categoria);

      // 2. Dispara a impressão física / simulada na Bematech MP-4200 TH
      await impressoraServico.imprimirSenha(novaSenha);

      // 3. Exibe a tela de confirmação ("Ficha Impressa")
      setSenhaEmitida(novaSenha);

      // 4. Temporizador de 4 segundos para retorno automático à tela inicial
      if (timerLimpeza.current) clearTimeout(timerLimpeza.current);
      timerLimpeza.current = setTimeout(() => {
        setSenhaEmitida(null);
        setProcessando(false);
      }, 4000);
    } catch (erro) {
      console.error('[TotemApp] Falha ao emitir e imprimir senha:', erro);
      setProcessando(false);
    }
  };

  return (
    <SafeAreaView style={estilos.telaSegura}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* 1. Barra Superior do Totem */}
      <View style={estilos.barraSuperior}>
        <View style={estilos.blocoMarca}>
          <Image
            source={require('./assets/logo-sao-joao.png')}
            style={estilos.logoMarca}
            resizeMode="contain"
          />
          <View>
            <Text style={estilos.tituloMarca}>AUTO ESCOLA SÃO JOÃO</Text>
            <Text style={estilos.subtituloMarca}>Totem de Autoatendimento</Text>
          </View>
        </View>

        <View style={estilos.blocoControles}>
          <View style={estilos.relogioBadge}>
            <MaterialCommunityIcons name="clock-outline" size={18} color="#94a3b8" />
            <Text style={estilos.textoRelogio}>{horaAtual}</Text>
          </View>

          <TouchableOpacity
            style={estilos.botaoEngrenagem}
            onPress={() => setModalConfigAberto(true)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="cog-outline" size={24} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Área Principal com Grade de Serviços */}
      <View style={estilos.corpoPrincipal}>
        <View style={estilos.bannerInstrucao}>
          <Text style={estilos.tituloInstrucao}>Como podemos ajudar você hoje?</Text>
          <Text style={estilos.subtituloInstrucao}>
            Toque na opção desejada para retirar sua senha de atendimento
          </Text>
        </View>

        {carregando ? (
          <View style={estilos.estadoCentralizado}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={estilos.textoCarregando}>Carregando serviços...</Text>
          </View>
        ) : categorias.length === 0 ? (
          <View style={estilos.estadoCentralizado}>
            <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#94a3b8" />
            <Text style={estilos.textoVazio}>Nenhum serviço disponível no momento.</Text>
            <TouchableOpacity style={estilos.botaoRecarregar} onPress={carregarCategorias}>
              <Text style={estilos.textoBotaoRecarregar}>Recarregar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={estilos.gradeCategorias}
            showsVerticalScrollIndicator={false}
          >
            {categorias.map((cat) => {
              const ehPrioritario = Boolean(cat.prioridade);
              const corBadgeFundo = cat.cor_fundo || '#dbeafe';
              const corBadgeTexto = cat.cor_badge || '#2563eb';

              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    estilos.cartaoCategoria,
                    ehPrioritario && estilos.cartaoPrioritario,
                    processando && estilos.cartaoDesabilitado
                  ]}
                  onPress={() => handleEmitirSenha(cat)}
                  disabled={processando}
                  activeOpacity={0.75}
                >
                  <View style={estilos.cabecalhoCartao}>
                    <View
                      style={[
                        estilos.badgePrefixo,
                        { backgroundColor: corBadgeFundo }
                      ]}
                    >
                      <Text style={[estilos.textoPrefixo, { color: corBadgeTexto }]}>
                        {cat.prefixo}
                      </Text>
                    </View>

                    {ehPrioritario && (
                      <View style={estilos.tagPrioridade}>
                        <MaterialCommunityIcons name="star" size={14} color="#854d0e" />
                        <Text style={estilos.textoTagPrioridade}>PRIORITÁRIO</Text>
                      </View>
                    )}
                  </View>

                  <View style={estilos.corpoCartao}>
                    <Text style={estilos.tituloCartao}>{cat.nome}</Text>
                    <Text style={estilos.descricaoCartao}>
                      {ehPrioritario
                        ? 'Atendimento preferencial garantido por lei.'
                        : 'Atendimento convencional por ordem de chegada.'}
                    </Text>
                  </View>

                  <View style={estilos.rodapeCartao}>
                    <Text style={estilos.textoAcaoCartao}>Toque para retirar</Text>
                    <MaterialCommunityIcons name="arrow-right" size={20} color="#2563eb" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* 3. Rodapé Institucional */}
      <View style={estilos.rodape}>
        <Text style={estilos.textoRodape}>
          Auto Escola São João &bull; Sistema de Gestão de Filas
        </Text>
      </View>

      {/* 4. Modal / Overlay Transitório de Senha Impressa */}
      <Modal visible={Boolean(senhaEmitida)} transparent animationType="fade">
        <View style={estilos.fundoConfirmacao}>
          <View style={estilos.cartaoConfirmacao}>
            <View style={estilos.iconeSucessoCirculo}>
              <MaterialCommunityIcons name="printer-check" size={54} color="#059669" />
            </View>

            <Text style={estilos.tituloConfirmacao}>Senha Emitida com Sucesso!</Text>

            <View style={estilos.blocoSenhaDestaque}>
              <Text style={estilos.rotuloSuaSenha}>SUA SENHA</Text>
              <Text style={estilos.numeroSenhaDestaque}>
                {senhaEmitida?.codigo_formatado}
              </Text>
              <Text style={estilos.servicoConfirmacao}>
                {senhaEmitida?.tipo_servico}
              </Text>
            </View>

            <View style={estilos.avisoRetirada}>
              <MaterialCommunityIcons name="arrow-down-bold" size={28} color="#2563eb" />
              <Text style={estilos.textoRetirada}>
                Por favor, retire sua senha impressa abaixo.
              </Text>
            </View>

            <Text style={estilos.instrucaoAcompanhamento}>
              Aguarde a chamada do seu número no painel da TV.
            </Text>
          </View>
        </View>
      </Modal>

      {/* 5. Modal de Configurações Técnicas */}
      <ModalConfiguracoes
        visivel={modalConfigAberto}
        aoFechar={() => setModalConfigAberto(false)}
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  telaSegura: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  barraSuperior: {
    backgroundColor: '#0f172a',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b'
  },
  blocoMarca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  logoMarca: {
    width: 52,
    height: 52
  },
  tituloMarca: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  subtituloMarca: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2
  },
  blocoControles: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  relogioBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10
  },
  textoRelogio: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'monospace'
  },
  botaoEngrenagem: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#1e293b'
  },
  corpoPrincipal: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 24,
    paddingTop: 24
  },
  bannerInstrucao: {
    alignItems: 'center',
    marginBottom: 24
  },
  tituloInstrucao: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 6
  },
  subtituloInstrucao: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center'
  },
  gradeCategorias: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'center',
    paddingBottom: 32
  },
  cartaoCategoria: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderRadius: 20,
    padding: 24,
    width: '46%',
    minWidth: 300,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  cartaoPrioritario: {
    borderLeftWidth: 8,
    borderLeftColor: '#eab308'
  },
  cartaoDesabilitado: {
    opacity: 0.6
  },
  cabecalhoCartao: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  badgePrefixo: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10
  },
  textoPrefixo: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'monospace'
  },
  tagPrioridade: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef9c3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fde047'
  },
  textoTagPrioridade: {
    color: '#854d0e',
    fontSize: 11,
    fontWeight: '800'
  },
  corpoCartao: {
    marginBottom: 20
  },
  tituloCartao: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8
  },
  descricaoCartao: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20
  },
  rodapeCartao: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 14
  },
  textoAcaoCartao: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '600'
  },
  estadoCentralizado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32
  },
  textoCarregando: {
    marginTop: 14,
    fontSize: 16,
    color: '#64748b'
  },
  textoVazio: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b'
  },
  botaoRecarregar: {
    marginTop: 16,
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  textoBotaoRecarregar: {
    color: '#ffffff',
    fontWeight: '600'
  },
  rodape: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 12,
    alignItems: 'center'
  },
  textoRodape: {
    color: '#64748b',
    fontSize: 13
  },
  fundoConfirmacao: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  cartaoConfirmacao: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    width: '100%',
    maxWidth: 520,
    padding: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12
  },
  iconeSucessoCirculo: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  tituloConfirmacao: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 20
  },
  blocoSenhaDestaque: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 18,
    width: '100%',
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 24
  },
  rotuloSuaSenha: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#64748b',
    marginBottom: 6
  },
  numeroSenhaDestaque: {
    fontSize: 60,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 2
  },
  servicoConfirmacao: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '600',
    marginTop: 6
  },
  avisoRetirada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16
  },
  textoRetirada: {
    color: '#1e40af',
    fontSize: 16,
    fontWeight: '700'
  },
  instrucaoAcompanhamento: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center'
  }
});
