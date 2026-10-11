# PIN de acesso é uma trava local do navegador, não criptografia

O painel pede um **PIN de acesso** de 4 números a cada acesso. Não há servidor, então o PIN é conferido no próprio navegador. Ele é guardado só como derivação PBKDF2-SHA256, com sal aleatório e 600 mil iterações, no `localStorage` (`lume.access.v1`). Fica fora do IndexedDB da clínica e fora do backup. A sessão aberta vive na memória da aba e é compartilhada entre abas do painel abertas ao mesmo tempo (BroadcastChannel), para que a impressão em outra aba não peça o PIN de novo.

Consideramos criptografar os dados com uma chave derivada do PIN. Descartamos por enquanto: com só 10 mil PINs possíveis, quem copiasse o banco testaria todos em pouco tempo. Além disso, a criptografia quebraria as buscas e os índices do IndexedDB. O PIN protege contra quem senta no computador e abre o painel. Ele não protege contra quem tem acesso técnico ao navegador.

## Consequências

- Os dados continuam legíveis no IndexedDB por quem usar as ferramentas do navegador. Proteção real exige criptografia de disco e senha no computador, ou um backend com autenticação (quando houver banco remoto, o PIN dá lugar a login de verdade).
- O PIN é de cada navegador: restaurar um backup em outro computador não leva o PIN, e "Apagar tudo" não o remove.
- "Esqueci o PIN" apaga os dados da clínica e o PIN. Sem isso, trocar o PIN contornaria a trava. O registro de atividades é preservado.
- Cinco erros seguidos causam uma pausa de 30 s, que dobra a cada nova série até 15 min. O controle fica na credencial e sobrevive a recarregar a página.
- O PIN nunca vai para o registro de atividades. Só os eventos são registrados: criado, liberado, incorreto, bloqueado, alterado e redefinido.
- No GitHub Pages, a origem `maycrodrigues.github.io` é compartilhada com outros projetos do mesmo usuário. Por isso as chaves usam o prefixo `lume`.
