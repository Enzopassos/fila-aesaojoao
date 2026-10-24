---
name: verificacao-e-tdd
description: Use durante o desenvolvimento e antes de finalizar qualquer funcionalidade ou ajuste. Impõe o princípio de evidência empírica antes de dar tarefas como concluídas e práticas de TDD quando viável.
---

# Verificação Empírica e Test-Driven Development (TDD)

Esta habilidade garante que nenhuma tarefa seja declarada como "finalizada" sem que haja uma comprovação factual e observável de seu funcionamento correto.

---

## 1. Princípio da Evidência Antes da Conclusão

- **Proibição de Alegações Cegas:** É terminantemente proibido afirmar frases como *"Está pronto!"*, *"Funciona perfeitamente!"* ou *"O problema foi resolvido"* baseando-se apenas em inspeção visual do próprio código escrito.
- **Evidência Obrigatória:** Para concluir uma tarefa, o agente deve apresentar uma evidência verificável:
  - Saída bem-sucedida de execução de testes unitários ou de integração no terminal; ou
  - Execução de script de validação de cenário; ou
  - Inspeção de console/logs no navegador ou no ambiente de execução comprovando o resultado esperado sem erros silenciosos.

---

## 2. Fluxo TDD (Red-Green-Refactor)

Sempre que o projeto possuir infraestrutura de testes (Jest, Vitest, PHPUnit, etc.) ou quando a lógica puder ser isolada em testes unitários:

1. **RED (Escreva o Teste com Falha):**
   - Escreva primeiro o caso de teste que define a funcionalidade ou reproduz o bug.
   - Execute o teste e confirme que ele falha pela razão correta (não por erro de sintaxe do próprio teste).
2. **GREEN (Implementação Mínima):**
   - Escreva a menor quantidade de código de produção suficiente para fazer o teste passar.
   - Execute o teste novamente e comprove a aprovação.
3. **REFACTOR (Limpeza e Padrões):**
   - Refatore o código para atender às diretrizes de SOLID, Clean Code e nomenclatura em português, garantindo que os testes continuem verdes.

---

## 3. Verificação em Ambientes Visuais ou Jogos (Canvas/WebGL)

Para projetos onde testes automatizados formais são inviáveis ou desproporcionais (ex: jogos interativos em Canvas ou WebGL):
- Execute o ambiente localmente e verifique se não há mensagens de erro ou *warnings* no console.
- Inspecione variáveis de estado e fluxos de animação/loop de jogo para certificar que o ciclo de vida dos objetos e eventos está consistente.
