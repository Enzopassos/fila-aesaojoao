---
trigger: always_on
---

# Padrões de Código, Arquitetura e Boas Práticas

Este documento estabelece as diretrizes arquiteturais, padrões de escrita de código e princípios de engenharia de software obrigatórios para os projetos.

---

## 1. Idioma e Nomenclatura

- **Identificadores em Português:**
  - Todas as variáveis, funções, métodos, parâmetros, classes, interfaces e tabelas/coleções devem ser nomeados em **Português** (ex: `calcularTotal()`, `obterUsuarioPorId()`, `dadosCliente`, `GerenciadorColisao`).
  - Mantenha termos técnicos universais consolidados na indústria (ex: `ID`, `URL`, `API`, `token`, `payload`, `status`, `mesh`, `canvas`, `FPS`, `deltaTempo`).
- **Nomes Claros e Sem Abreviações Obscuras:**
  - Evite nomes genéricos ou de uma única letra (ex: use `listaDeProdutos` em vez de `p` ou `data`; `indice` em vez de `i` exceto em loops muito curtos).
  - Funções e métodos devem iniciar com verbos no infinitivo (ex: `validarFormulario()`, `converterParaJson()`, `atualizarFisica()`).
  - Constantes devem ser grafadas em `MAIUSCULAS_COM_UNDERLINE` (ex: `LIMITE_MAXIMO_TENTATIVAS`, `GRAVIDADE_PADRAO`).

---

## 2. Princípios SOLID Aplicados

- **S - Single Responsibility Principle (Responsabilidade Única):**
  - Cada classe, arquivo, função ou componente deve ter um único motivo para mudar.
  - Separe estritamente camadas: lógica visual/renderização não deve manipular persistência ou regras de negócio centrais.
- **O - Open/Closed Principle (Aberto/Fechado):**
  - Módulos devem estar abertos para extensão, mas fechados para modificação direta.
  - Prefira composição, estratégias (Strategy Pattern) e polimorfismo para adicionar novas capacidades sem reescrever o código base testado.
- **L - Liskov Substitution Principle (Substituição de Liskov):**
  - Subclasses e implementações derivadas devem poder substituir suas abstrações base sem quebrar o sistema ou alterar comportamentos esperados.
- **I - Interface Segregation Principle (Segregação de Interfaces):**
  - Crie interfaces ou contratos pequenos, coesos e específicos. Não force um módulo a implementar métodos dos quais ele não necessita.
- **D - Dependency Inversion Principle (Inversão de Dependência):**
  - Módulos de alto nível não devem depender diretamente de detalhes de baixo nível; ambos devem depender de abstrações.
  - Injete dependências (serviços, repositórios, gerenciadores) em vez de instanciá-los manualmente dentro de componentes ou classes de domínio.

---

## 3. Clean Code e Arquitetura Simples

- **KISS (Keep It Simple, Stupid):** Priorize a solução mais direta, legível e elegante. Evite abstrações prematuras ou *over-engineering* para cenários hipotéticos que talvez nunca existam.
- **DRY (Don't Repeat Yourself):** Elimine duplicações de lógica de negócio extraindo funções auxiliares ou módulos compartilhados.
- **Fail-Fast (Falhe Rapidamente):** Valide parâmetros de entrada e condições de contorno logo no início de funções ou métodos, abortando a execução com erros claros antes de processar dados inválidos.
- **Estrutura Modular por Domínio/Funcionalidade:**
  - Agrupe arquivos por afinidade funcional ou de domínio, facilitando manutenção, testes isolados e localização de código.

---

## 4. Integridade e Segurança do Código

- **Código 100% Completo e Funcional:** É expressamente proibido omitir trechos de código com comentários como `// adicione o restante aqui` ou `// implementar lógica restante`. O código entregue deve ser funcional e pronto para execução.
- **Segurança Absoluta (Sem Hardcoding):** Nunca insira senhas, chaves de API, segredos ou tokens diretamente nos arquivos de código. Utilize sempre variáveis de ambiente (`.env`).
- **Sanitização e Validação:** Todas as entradas externas (dados de formulários, parâmetros de requisição, mensagens via rede/storage) devem ser rigorosamente validadas e higienizadas.
- **Alerta de Más Práticas:** Se o desenvolvedor compartilhar um trecho contendo vulnerabilidades, vazamento de memória ou violação grave de arquitetura, o agente deve apontar o risco imediatamente e sugerir a correção segura.
