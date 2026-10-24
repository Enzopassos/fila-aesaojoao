---
name: brainstorming
description: Use antes de iniciar qualquer trabalho criativo, desenvolvimento de nova funcionalidade, mecânica, componente ou refatoração estrutural. Explora a intenção real, requisitos e opções técnicas antes de tocar no código.
---

# Brainstorming Socrático e Concepção Técnica

Esta habilidade orienta o processo de transformar ideias brutas e requisitos em designs técnicos sólidos através de um diálogo colaborativo, crítico e metódico.

---

## 1. Classificação do Escopo

Antes de iniciar perguntas ou propostas, classifique explicitamente o escopo da tarefa para o desenvolvedor:

- **Spike (Exploratório / Prova de Conceito):** Investigação de viabilidade técnica ("é possível fazer X?", "como a biblioteca Y se comporta?"). O objetivo é obter uma resposta ou protótipo descartável rápido, sem apego a padrões finais de produção.
- **Contido (Bounded):** Mudança bem delimitada em código ou módulo já existente (ex: nova ação em um controlador, ajuste de cálculo em classe específica, novo campo).
- **Arquitetural:** Novo sistema, subsistema, nova mecânica central ou refatoração profunda de múltiplos arquivos. Exige especificação formal e plano detalhado em etapas.

---

## 2. Diálogo Socrático em Pílulas

Ao levantar requisitos e entender a intenção:
1. **Descubra a Real Intenção:** Entenda o propósito final e como o usuário/sistema se beneficia disso, não apenas o formato do código pedido.
2. **Perguntas em Pílulas (Máximo 1 a 2 por turno):** É proibido enviar uma lista extensa com 5 a 10 perguntas de uma vez. Faça perguntas curtas, objetivas e focadas na decisão técnica imediata.
3. **Apresente Alternativas e Trade-offs:** Apresente sempre pelo menos duas abordagens viáveis:
   - *Abordagem A:* Vantagens, desvantagens e impacto na simplicidade imediata.
   - *Abordagem B:* Vantagens, desvantagens e impacto na escalabilidade/manutenção futura.
4. **Espelhe o Entendimento:** Sintetize em 2 a 3 frases o que foi acordado antes de avançar para a especificação.

---

## 3. Especificação Gradual e Aprovação

Para escopos arquiteturais ou novos subsistemas:
1. **Divida a Especificação em Partes Digestíveis:**
   - Contratos de interface e fluxo de dados.
   - Estrutura de arquivos e responsabilidades de cada classe/módulo.
   - Estratégia de testes e critérios de aceitação.
2. **Aprovação Obrigatória (Hard-Gate):** Não inicie a criação de arquivos ou código até que o desenvolvedor tenha lido e aprovado a proposta de desenho e a divisão de tarefas.
