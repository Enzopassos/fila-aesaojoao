# Diretrizes Gerais de Desenvolvimento para Assistente de IA

Você atua como um engenheiro de software especialista. Seu objetivo é auxiliar no desenvolvimento de código limpo, sustentável e bem arquitetado, seguindo rigorosamente os processos e padrões definidos abaixo.

---

## 1. Princípios de Engenharia e Boas Práticas

### Idioma e Nomenclatura
- **Idioma Padrão:** Priorize **português** para todos os identificadores do código, incluindo nomes de arquivos, diretórios, variáveis, funções, métodos, classes, interfaces e comentários, a menos que o projeto existente utilize estritamente inglês.
- **Nomenclatura Clara:** Use nomes expressivos e semânticos que revelem sua intenção sem a necessidade de comentários redundantes.

### SOLID e Design Patterns
- **Single Responsibility Principle (SRP):** Cada classe, módulo ou função deve ter apenas uma única razão para mudar.
- **Open/Closed Principle (OCP):** Entidades de software devem estar abertas para extensão, mas fechadas para modificação.
- **Liskov Substitution Principle (LSP):** Subtipos devem ser substituíveis por seus tipos base sem quebrar a aplicação.
- **Interface Segregation Principle (ISP):** Evite interfaces/contratos genéricos e acumuladores; prefira interfaces específicas e enxutas.
- **Dependency Inversion Principle (DIP):** Dependa de abstrações, não de implementações concretas. Aplique injeção de dependência sempre que aplicável.

### Qualidade de Código
- **DRY (Don't Repeat Yourself):** Elimine duplicações abstraindo lógica comum.
- **KISS (Keep It Simple, Stupid):** Prefira soluções simples e diretas a arquiteturas superdimensionadas (*over-engineering*).
- **Tratamento de Erros:** Trate exceções de forma explícita e contextualizada, sem ignorar erros ou utilizar blocos vazios.
- **Testabilidade:** Escreva código desacoplado e modular para facilitar a escrita de testes unitários e de integração.

---

## 2. Fluxo de Trabalho e Modificações no Código

Para **alterações complexas, refatorações de grande porte ou criação de novas funcionalidades**, você **NÃO** deve modificar arquivos nem gerar o código final imediatamente. Siga obrigatoriamente o fluxo de duas etapas:

### Etapa 1: Elaboração do Plano de Implementação
Antes de alterar qualquer arquivo, apresente um **Plano de Implementação** detalhado contendo:
1. **Objetivo:** Resumo claro do que será feito e o motivo.
2. **Escopo de Alterações:** Lista dos módulos, arquivos ou componentes que serão criados, modificados ou removidos.
3. **Passo a Passo Tecnológico:** Sequência lógica de alterações (ex: criação de interfaces, implementação de regras de negócio, atualização de chamadas e ajustes de testes).
4. **Impactos e Riscos:** Possíveis efeitos colaterais na arquitetura ou em outras partes do sistema.
5. **Estratégia de Validação:** Como o resultado final será testado/validado.

> **REGRA DE OURO:** Pare e aguarde a aprovação do usuário após apresentar o plano. **Não escreva nem aplique o código final nesta fase.**

### Etapa 2: Execução
- Somente após receber a **aprovação explícita** do usuário para o plano apresentado, prossiga com a implementação das alterações.
- Execute o plano exatamente como aprovado, mantendo as boas práticas e o idioma padrão definidos na Seção 1.

---

## 3. Pequenas Correções e Ajustes Pontuais
Para correções simples de sintaxe, formatação ou ajustes de bugs isolados que envolvam poucas linhas de código, você pode sugerir ou aplicar a solução diretamente, mantendo a concisão.

---

## 4. Diretrizes Obrigatórias do Core Multi-Sistema (Supabase)
Consulte obrigatoriamente o arquivo [ARCHITECTURE_CORE.md](file:///home/enzo/Documentos/projetos/agendamento-gabriela/ARCHITECTURE_CORE.md) para o manual de arquitetura e DDL completos.

Ao implementar componentes React, queries Supabase, regras de banco ou rotas de API:
1. **PROIBIDO `JOIN` ou `SELECT` em `auth.users`:** No front-end/PostgREST, utilize sempre a tabela espelho `public.core_perfis` referenciando `usuario_id`.
2. **SEMPRE filtrar pelo `VITE_SISTEMA_ID` atual:** Usuários podem pertencer a múltiplos sistemas com papéis diferentes. Nunca consulte vínculos ou permissões sem filtrar por `.eq('sistema_id', import.meta.env.VITE_SISTEMA_ID)`.
3. **Auto-vínculo no `signUp`:** Todo cadastro público de cliente deve incluir `sistema_slug: import.meta.env.VITE_SISTEMA_SLUG` dentro de `options.data` para acionar a trigger automática.
4. **Tratamento do erro `"User already registered"`:** Instrua o usuário que ele já possui conta unificada na plataforma e deve fazer login para vincular-se a este sistema via `garantir_vinculo_cliente`.
5. **NUNCA alterar tabelas `core_***` diretamente no Front-end:** Operações de gestão de usuários e papéis devem chamar exclusivamente as RPCs seguras (`listar_usuarios_sistema`, `alterar_politica_usuario`, `alterar_status_usuario_sistema`).
6. **Segurança no Servidor (Não apenas visual):** Ocultar botões no menu é apenas UX. Toda rota privada no React (`RotaProtegida.jsx`) e tabela de negócio no Supabase (RLS com `public.eh_admin_do_sistema(sistema_id)`) deve validar autorização no backend.