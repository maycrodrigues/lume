# Saldo de pacotes e situação de cupons são calculados, não gravados

O **Saldo do pacote** é contado a partir dos Atendimentos (linhas com `patientPackageId`), e não guardado num contador. A situação do **Cupom emitido** (disponível, expirado…) é derivada das datas e de `redeemedAt`, sem rotina que "expire" cupons. Assim, excluir ou editar um Atendimento devolve a sessão e libera o cupom automaticamente, e não existe contador que possa divergir do histórico.

## Consequences

- Não crie campos como `used`/`remaining` no Pacote contratado nem `status` no Cupom emitido: use `contractUsage`/`contractStatus` e `issuedCouponStatus` (`src/domain/package.ts`, `src/domain/coupon.ts`).
- A validade de pacote e cupom é conferida na data do Atendimento — um atendimento lançado depois, com data dentro do prazo, é aceito.
- Pacote contratado e Cupom emitido guardam cópia de nomes, valores e porcentagens: mudanças no catálogo ou no cupom cadastrado não alteram o que já foi prometido à paciente.
