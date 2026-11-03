# Dados na nuvem: serviços num Durable Object com SQLite, atrás do Cloudflare Access

Para usar o painel em mais de um aparelho, os dados saem do IndexedDB e vão para o Cloudflare, dentro do plano gratuito. Os serviços (`src/application`) passam a rodar no servidor sem reescrita: um Worker recebe `POST /api/rpc` (`{ service, method, args }`) e repassa a um Durable Object `Clinic`. Ele guarda tudo num SQLite só da clínica (`createSqlStore`) e executa uma operação por vez.

Escolhemos o Durable Object, e não o D1, porque os serviços fazem transações com leituras e escritas intercaladas (`store.transaction(async …)`). O SQLite do Durable Object aceita esse tipo de transação; o D1 só aceita lotes prontos, o que obrigaria a reescrever os serviços. No plano gratuito, só Durable Objects com SQLite estão disponíveis, com até 1 GB por banco.

O login é do Cloudflare Access (código por e-mail, até 50 usuários grátis). O Worker confere o token `Cf-Access-Jwt-Assertion` (assinatura, aplicativo, emissor, validade e lista de e-mails) antes de qualquer dado. Sem `ACCESS_TEAM_DOMAIN` e `ACCESS_AUD`, a API responde 503: ela nunca fica aberta por engano.

## Consequências

- O adapter SQLite passa na mesma suíte de contrato do IndexedDB, e `npm test` também roda todos os testes de serviço sobre o SQLite (`LUME_STORE=sql`).
- Continuam no aparelho, e a API recusa: PIN (`access`), publicação do site (`site`) e preparo de imagens. As fotos ficam como BLOB no SQLite (limite de 2 MB por linha), o que cabe depois do preparo no aparelho. Se o espaço apertar, migram para o R2, que tem 10 GB grátis.
- Cada escrita pela API também fica no registro de atividades com o e-mail de quem fez.
- A interface continua no IndexedDB até a etapa em que `composition.ts` passa a usar a API. A migração dos dados é exportar o backup e importar pela API (`backup.importData`).
- Limites do plano gratuito: 100 mil pedidos por dia e 10 ms de CPU por pedido no Worker (ele só confere o login e repassa). Acima disso, os pedidos falham, sem cobrança.
