---
name: depuracao-sistematica
description: Use sempre que encontrar um bug, falha inesperada, regressão, exceção ou comportamento divergente do esperado. Proíbe palpites ou tentativas e erros, impondo o método científico de 4 fases.
---

# Depuração Sistemática (Método Científico contra Bugs)

Esta habilidade estabelece um protocolo rigoroso para investigação e correção de defeitos em software. A regra fundamental é: **nunca tente "adivinhar" o conserto alterando código aleatoriamente.**

---

## As 4 Fases Obrigatórias

### Fase 1: Reprodução Determinística e Coleta de Evidências
- **Reproduzir o Problema:** Isole o cenário ou conjunto de entradas que faz o bug acontecer consistentemente.
- **Coleta de Fatos:** Capture stack traces, mensagens de log, valores de variáveis no momento da quebra ou comportamento no console/navegador.
- **Regra de Ouro:** É **expressamente proibido** alterar arquivos de código nesta fase. O foco é 100% em observação e levantamento de evidências.

### Fase 2: Isolamento da Causa Raiz
- **Rastreamento de Origem:** Rastreie a cadeia causal até o ponto exato onde o estado do sistema se tornou inválido (onde a premissa errada foi introduzida).
- **Distinguir Sintoma de Causa:** Tratar uma exceção adicionando um `if (x !== null)` sem entender por que `x` ficou nulo é mascarar o sintoma. Descubra *por que* `x` não deveria ser nulo.
- **Explicação ao Desenvolvedor:** Explique resumidamente a mecânica da falha antes de propor a solução.

### Fase 3: Correção Cirúrgica Mínima
- **Menor Intervenção Possível:** Aplique a correção mais limpa e focada possível na causa raiz identificada.
- **Evite Refatorações Oportunistas Durante o Fix:** Não aproveite a correção do bug para reorganizar módulos não relacionados ou mudar padrões de projeto; isso introduz novas variáveis e dificulta o isolamento de regressões.

### Fase 4: Prova de Não-Regressão e Verificação
- **Comprovação do Fix:** Reexecute o cenário que falhava na Fase 1 e demonstre que o comportamento agora é o esperado.
- **Checagem de Efeitos Colaterais:** Verifique se fluxos correlatos e cenários normais continuam operando sem falhas.
