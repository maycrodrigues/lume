# Registro de atividades gravado no seam de persistência

Requisito: registrar tudo o que puder ser registrado. Em vez de cada serviço lembrar de registrar suas alterações, `withActivityLog` decora o `DataStore` e toda escrita (`save`/`remove`) gera um Registro de atividade com a ação, os campos alterados (antes → depois) e, na exclusão, uma cópia completa do registro removido. O registro é gravado na mesma transação da alteração, então nunca há dado alterado sem registro, nem registro de algo que foi desfeito.

## Considered Options

- **Registrar em cada serviço**: mensagens mais ricas, mas basta esquecer um caso para perder rastreabilidade.
- **Decorator no seam (escolhido)**: cobertura garantida; as mensagens são genéricas ("Alteração de agendamento"), mas o detalhe está nos campos alterados.

Eventos que não são escrita de dados (navegação, erros, backup) são registrados explicitamente pelo `ActivityService`. `DataStore.load` (backup/importação) não passa pelo decorator de propósito: gera um único registro-resumo em vez de milhares.
