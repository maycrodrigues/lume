# Dados locais em IndexedDB, atrás do port `DataStore`

Só uma profissional usa o painel, em um único computador, e não há servidor nesta fase. Por isso os dados ficam no IndexedDB do navegador (via Dexie), mas nenhum serviço conhece o Dexie: tudo passa pelo port `DataStore` (`src/application/ports.ts`). Hoje existem dois adapters — IndexedDB (produção) e memória (testes) — e ambos passam pela mesma suíte de contrato (`dataStore.contract.test.ts`). Migrar para um banco remoto significa escrever um terceiro adapter que passe nessa suíte.

## Consequências

- Os dados vivem **apenas neste navegador, neste computador**. Limpar os dados do site, trocar de navegador ou de máquina perde tudo — por isso existe exportação/importação de backup em Configurações. Faça backups regulares.
- Datas são strings ISO e dinheiro é inteiro em centavos, para que o formato seja portável para qualquer banco.
- Dentro de `transaction()`, só se aguardam operações do próprio `DataStore`: o IndexedDB encerra a transação se a execução esperar qualquer outra promise.
