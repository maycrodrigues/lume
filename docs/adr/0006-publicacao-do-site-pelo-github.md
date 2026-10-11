# Dados do site público são publicados pelo painel, via GitHub

O site da clínica (landing page) é estático, no GitHub Pages, e os dados do painel ficam só no navegador da Profissional. Para o nome da profissional, o WhatsApp, o e-mail e os horários aparecerem no site sem um servidor, o painel tem um botão **Publicar no site**. Ele monta o perfil público a partir das Configurações e do horário de atendimento e grava `public/site.json` no repositório pela API do GitHub. O push dispara o deploy, e a landing lê `site.json` ao abrir.

A publicação usa um token fine-grained do GitHub, com acesso só ao repositório `lume` e permissão "Contents: Read and write". A Profissional cola o token uma vez em Configurações → Site. Ele fica no `localStorage` deste navegador, fora dos dados da clínica e do backup.

Consideramos colocar os dados direto no código (cada mudança dependeria de um desenvolvedor) e usar um serviço de banco externo (mais uma conta e mais um custo nesta fase). O GitHub já hospeda o site, então publicar por ele não acrescenta infraestrutura.

## Consequências

- Só vai para o site o perfil público (`SiteProfile`): nada de pacientes, agenda ou finanças.
- O site muda só quando a Profissional publica. Editar as Configurações sem publicar não altera o site.
- Cada publicação vira um commit `chore(site): …` na `main`. Antes de enviar alterações de código, faça `git pull --rebase`.
- Quem tiver acesso ao navegador desbloqueado pode publicar. O token é apagado em "Desconectar" e em "Esqueci o PIN". A origem `maycrodrigues.github.io` é compartilhada com outros projetos do mesmo usuário no GitHub Pages, por isso o token tem que ter o menor acesso possível e uma validade curta.
- Quando houver backend, o perfil público passa a ser servido por ele, e o token deixa de existir.
