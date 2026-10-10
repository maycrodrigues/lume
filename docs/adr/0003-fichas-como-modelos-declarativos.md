# Anamnese e Fichas de avaliação são modelos declarativos

A clínica trabalha com fichas longas (anamnese geral, avaliação facial, corporal, capilar, harmonização) e vai incluir perguntas com frequência. Em vez de um campo tipado por pergunta, cada ficha é um **Modelo de ficha** — dados em `src/domain/questionnaire/` — e as respostas são gravadas como `{ idDaPergunta: resposta }`. Um único motor gera o formulário, o resumo, a impressão, os itens de Atenção clínica, a tabela de evolução das medidas e os rótulos do Registro de atividades.

## Consequences

- Incluir uma pergunta = acrescentar uma linha no modelo. Nenhuma migração de banco é necessária.
- **Nunca renomeie nem reutilize o `id` de uma pergunta**: é a chave gravada. Para trocar o texto, mude só o `label`. Ids são únicos entre todos os modelos.
- Ao remover uma pergunta do modelo, as respostas antigas são preservadas no registro (não aparecem mais no formulário).
- Regras específicas de uma pergunta (ex.: cálculo do IMC) vivem no próprio modelo como função; não ficam espalhadas pela interface.
