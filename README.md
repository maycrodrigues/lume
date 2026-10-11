# LUME · Painel de gestão

Painel da clínica de estética integrativa LUME: pacientes, prontuário (anamnese, fichas de avaliação, fotos de acompanhamento, atendimentos, procedimentos realizados e prescrições), agenda, catálogo de procedimentos, pacotes com simulador de desconto, cupons de desconto, financeiro e registro de atividades.

Uso local por uma única profissional, sem login. Os dados ficam no IndexedDB do navegador. **Exporte backups com frequência** em Configurações → Backup.

## Rodando

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testes de aplicação + contrato dos adapters
npm run typecheck
npm run build
```

Para explorar sem dados reais: Painel → "Carregar dados de demonstração" (só aparece com o painel vazio). Para sair do modo demo: Configurações → Apagar tudo.

Os dados de demonstração são gerados com Faker (pt-BR) em `src/application/demoData.ts` e respeitam as regras da agenda (horário de atendimento padrão, 15 min entre pacientes e bloqueios). O teste `demoData.test.ts` confere essas regras.

## Commits e validações

As mensagens de commit seguem [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/), no formato `<tipo>(<escopo opcional>): <descrição em minúsculas>`.

```text
feat(agenda): mostra só horários livres no agendamento
fix(financeiro): corrige total com cupom aplicado
docs: explica a publicação no GitHub Pages
```

Tipos aceitos: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore` e `revert`.

Os hooks do Git ([Husky](https://typicode.github.io/husky/)) são instalados pelo `npm install`:

| Hook | O que roda | Bloqueia quando |
|---|---|---|
| `commit-msg` | commitlint | a mensagem não segue o padrão |
| `pre-commit` | Oxlint nos arquivos do commit (lint-staged) e typecheck | há erro ou aviso de lint, ou erro de tipo |
| `pre-push` | testes e build de produção | algum teste ou o build falha |

- `npm run lint` roda o Oxlint em todo o projeto, e `npm run check` roda lint, typecheck e testes. O CI também roda o lint antes dos testes.
- O linter é o Oxlint, e não o ESLint, porque o `typescript-eslint` ainda não suporta o TypeScript 7. As regras ficam em `.oxlintrc.json`.
- Exceções pontuais às regras ficam comentadas no próprio código, com o motivo.

## Publicação (GitHub Pages)

Cada push na branch `main` roda os testes, gera o build e publica em **https://maycrodrigues.github.io/lume/** (workflow em `.github/workflows/deploy.yml`).

- O build usa `BASE_PATH=/lume/`, e o roteador usa a mesma base. Localmente o painel continua na raiz.
- O GitHub Pages não tem fallback para SPA, então o workflow copia o `index.html` para `404.html`. Assim, recarregar `/lume/agenda` ou abrir uma impressão continua funcionando.
- Para testar o build publicado localmente, rode `BASE_PATH=/lume/ npm run build` e depois `npx vite preview --base /lume/`.
- Os dados continuam no navegador de quem usa. O site publicado é outra origem, então ele não enxerga os dados do `localhost`. Para levar os dados, use Configurações → Backup → exportar aqui e importar lá.

## Arquitetura

Clean Architecture em quatro camadas; as dependências apontam só para dentro.

```
src/
├── domain/          Entidades e regras puras (sem dependências)
├── application/     Serviços (casos de uso), ports e o registro de atividades
│   ├── ports.ts       DataStore, Repository, Clock, IdGenerator — o seam de persistência
│   ├── activityLog.ts Decorator que registra toda escrita de dados
│   └── services/      Um módulo por área: patients, appointments, consultations…
├── infrastructure/  Adapters do DataStore: IndexedDB (Dexie) e memória (testes)
├── presentation/    React + Tailwind: design system da marca, páginas por feature
└── main/main.tsx    Raiz de composição — o único lugar que conhece os adapters concretos
```

- A UI conversa só com `createServices()` (`src/application/index.ts`). Cada serviço valida a entrada (Zod), aplica as regras e grava dentro de uma transação.
- **Trocar o banco**: escreva um novo adapter que implemente `DataStore` e passe na suíte `src/infrastructure/dataStore.contract.test.ts`; depois troque uma linha em `main.tsx`. Ver [ADR 0001](docs/adr/0001-indexeddb-atras-do-port-datastore.md).
- **Registro de atividades**: toda criação/alteração/exclusão é registrada automaticamente com campos antes → depois (e cópia completa na exclusão), na mesma transação. Navegação, erros (inclusive não tratados), backup e impressão também são registrados. Ver [ADR 0002](docs/adr/0002-registro-de-atividades-no-seam-de-persistencia.md).
- **Fichas** (anamnese, avaliação facial/corporal/capilar, harmonização) são modelos declarativos em `src/domain/questionnaire/`. Para incluir uma pergunta, acrescente um item no modelo — formulário, impressão, alertas e registros se adaptam. Ver [ADR 0003](docs/adr/0003-fichas-como-modelos-declarativos.md).
- **Fotos** são reduzidas no navegador (máx. 2048 px, JPEG) com miniatura de 480 px e gravadas no IndexedDB como binário. O backup inclui as fotos (em base64).

O vocabulário do domínio (Atendimento, Ficha de avaliação, Procedimento Realizado, Prescrição, Lançamento…) está em [GLOSSARY.md](GLOSSARY.md).

## Como incluir perguntas numa ficha

Abra o modelo em `src/domain/questionnaire/` (`anamnesis.ts` ou `assessments.ts`) e acrescente um item na seção desejada:

```ts
{ id: 'thyroid', type: 'yesno', label: 'Distúrbio de tireoide', detail: 'Qual?', alert: true },
```

Tipos disponíveis: `text`, `textarea`, `number`, `date`, `check`, `yesno` (com detalhe opcional), `choice`, `multi`, `list` (tabela com linhas livres), `grid` (tabela com linhas fixas) e `computed` (calculado). `alert: true` faz a resposta aparecer em "Atenção clínica". Nunca renomeie o `id` de uma pergunta existente.

## Regras de negócio principais

- Agendamento dura a soma das durações dos procedimentos e só é aceito **dentro do horário de atendimento** do dia (Configurações → Horário de atendimento; padrão seg–sex 10h–17h, sáb 12h–16h, domingo fechado), fora de **bloqueios de agenda** e sem **conflito**: não há sobreposição e há um intervalo obrigatório (padrão 15 min) entre pacientes diferentes. Não existe "agendar mesmo assim". O formulário mostra só os horários livres para a duração escolhida.
- Agendamento só fica **Realizado** ao registrar o Atendimento. O registro cria, numa única transação: o atendimento, a prescrição (opcional), a cobrança no financeiro (opcional) e conclui o agendamento.
- O histórico guarda nome e valor cobrados de cada procedimento — mudar o catálogo não altera o prontuário.
- Paciente com histórico clínico ou financeiro não pode ser excluída, apenas arquivada.
- Excluir um atendimento reabre o agendamento, remove a cobrança pendente (a paga é mantida) e preserva prescrições, fichas e fotos.
- O nº da sessão é sugerido a partir de quantas vezes o procedimento já foi realizado na paciente.
- Paciente com fotos ou fichas também conta como "com histórico" (só pode ser arquivada).
- **Pacotes**: contratar congela itens e valores, lança a cobrança ("Pacotes") e define a validade. No atendimento, a linha que usa sessão do pacote não é cobrada; sem saldo, pacote vencido ou cancelado, o registro é recusado. Ver [ADR 0004](docs/adr/0004-saldos-e-validades-sao-calculados.md).
- **Cupons**: cada envio gera um código pessoal de uso único (`LUME-XXXXXX`), válido por N dias (padrão 30) a partir do envio. A validação presencial é na página Cupons; o uso acontece no registro do atendimento e desconta só procedimentos avulsos — nunca pacotes nem sessões de pacote. Excluir o atendimento libera o cupom.

## Testes

Os testes ficam nos seams públicos: a interface dos serviços (`src/application/__tests__`) e o contrato do `DataStore`, executado contra os dois adapters (memória e IndexedDB via `fake-indexeddb`).
