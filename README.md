# LUME · Estética & Cuidado Integrado

Site da clínica (landing page em `/`) e painel de gestão (em `/admin`).

Painel da clínica de estética integrativa LUME: pacientes, prontuário (anamnese, fichas de avaliação, fotos de acompanhamento, atendimentos, procedimentos realizados e prescrições), agenda, catálogo de procedimentos, pacotes com simulador de desconto, cupons de desconto, financeiro e registro de atividades.

Uso local por uma única profissional, sem login. Os dados ficam no IndexedDB do navegador. **Exporte backups com frequência** em Configurações → Backup.

## Rodando

```bash
npm install
npm run dev        # landing em http://localhost:5173 · painel em http://localhost:5173/admin
npm test           # testes de aplicação + contrato dos adapters
npm run typecheck
npm run build
```

Para explorar sem dados reais: `/admin` → Painel → "Carregar dados de demonstração" (só aparece com o painel vazio). Para sair do modo demo: Configurações → Apagar tudo.

Os dados de demonstração são gerados com Faker (pt-BR) em `src/application/demoData.ts` e respeitam as regras da agenda (horário de atendimento padrão, 15 min entre pacientes e bloqueios). O teste `demoData.test.ts` confere essas regras.

## Landing page e painel

| Rota | O que é |
|---|---|
| `/` | Landing page pública da clínica: abordagem, tratamentos, como funciona e contato. |
| `/admin/...` | Todo o painel (agenda, pacientes, financeiro…), sempre atrás do PIN de acesso. O rodapé da landing tem o link "Área da profissional". |

- **Dados de contato da landing:** vêm do painel. Veja "Publicação dos dados no site" abaixo.
- **Fotos:** as fotos vêm do Unsplash, com licença gratuita para uso comercial, e são servidas pelo CDN deles no tamanho e formato certos para cada tela. Para trocar uma foto, ajuste `src/presentation/features/landing/photos.tsx` (id da foto e ponto de foco). Os créditos aparecem no rodapé.
- **Carregamento separado:** o painel é carregado só ao entrar em `/admin`. Isso vale para os serviços, o IndexedDB e cada tela. Quem visita a landing não baixa o sistema e não ganha um banco local no navegador.
- **Endereços antigos** do painel, como `/agenda`, redirecionam para `/admin/agenda`. Qualquer outro endereço desconhecido volta para a landing.

## Publicação dos dados no site

O site mostra o nome e o registro da profissional, o botão discreto de WhatsApp, o e-mail, o Instagram, o endereço e os horários. Esses dados vêm de **Configurações → Dados da clínica** e do **Horário de atendimento**.

1. Em Configurações → **Site**, cole uma vez um token do GitHub (fine-grained), com acesso só ao repositório `lume` e "Contents: Read and write". O cartão mostra o passo a passo.
2. Clique em **Publicar no site**. O painel grava `public/site.json` no repositório, e o deploy atualiza o site em 1 a 2 minutos.
3. Enquanto nada for publicado, o site fica sem os contatos, e os botões "Agendar avaliação" levam à seção de contato.

Cada publicação é um commit na `main`, então faça `git pull --rebase` antes de enviar alterações de código. Detalhes e limites estão na [ADR 0006](docs/adr/0006-publicacao-do-site-pelo-github.md).

## Acesso com PIN

No primeiro acesso, o painel pede para criar um **PIN de 4 números**. O PIN digitado libera o painel neste navegador **até a próxima segunda-feira, 00h**. Toda segunda o PIN é pedido de novo.

- O botão **Bloquear painel**, na barra lateral, fecha o acesso na hora e volta a exigir o PIN. A barra lateral mostra quando o PIN será pedido de novo. Em Configurações → PIN de acesso dá para trocar o PIN.
- O acesso liberado vale para todas as abas, e bloquear também. Se a segunda-feira chegar com o painel aberto, ele se bloqueia sozinho.
- Cinco PINs errados seguidos causam uma pausa de 30 s, que dobra a cada nova série de erros.
- **Esqueci o PIN**: a única saída é apagar os dados da clínica neste navegador e criar um PIN novo. Depois dá para restaurar um backup.
- O PIN é uma trava de acesso, não criptografia, e fica guardado só como hash PBKDF2. Veja os detalhes e limites na [ADR 0005](docs/adr/0005-pin-de-acesso-local-por-navegador.md).

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
├── presentation/    React + Tailwind: design system da marca, landing page e páginas do painel por feature
└── main/
    ├── main.tsx         Monta o roteador (landing + /admin)
    └── composition.ts   Raiz de composição do painel — o único lugar que conhece os adapters concretos (carregada só em /admin)
```

- A UI conversa só com `createServices()` (`src/application/index.ts`). Cada serviço valida a entrada (Zod), aplica as regras e grava dentro de uma transação.
- **Trocar o banco**: escreva um novo adapter que implemente `DataStore` e passe na suíte `src/infrastructure/dataStore.contract.test.ts`; depois troque uma linha em `src/main/composition.ts`. Ver [ADR 0001](docs/adr/0001-indexeddb-atras-do-port-datastore.md).
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
