# LUME · Estética & Cuidado Integrado

Painel de gestão de uma clínica de estética integrativa operada por uma única profissional: pacientes, agenda, atendimentos, prontuário e finanças.

## Pessoas

**Paciente**:
Pessoa atendida pela clínica. Pode estar ativa ou arquivada.
_Avoid_: cliente, usuário

**Profissional**:
A pessoa que atende e opera o painel; assina prescrições com seu registro profissional.
_Avoid_: usuário, médica, admin

## Cuidado clínico

**Prontuário**:
O histórico clínico completo de uma Paciente: Anamnese, Fichas de avaliação, Fotos de acompanhamento, Atendimentos, Procedimentos Realizados e Prescrições.
_Avoid_: ficha, histórico, perfil

**Anamnese**:
Ficha de saúde, hábitos, histórico clínico e objetivos da Paciente; existe uma por Paciente e é mantida atualizada (não é datada).
_Avoid_: questionário, ficha de saúde

**Ficha de avaliação**:
Questionário clínico datado — avaliação facial, corporal, capilar ou registro de harmonização — repetido ao longo do tratamento para comparar a evolução.
_Avoid_: avaliação (sozinho), formulário, ficha (sozinho, quando puder ser confundido com a Anamnese)

**Modelo de ficha**:
A definição das perguntas de uma Anamnese ou Ficha de avaliação; mudar o modelo não apaga respostas já registradas.
_Avoid_: template, formulário

**Atenção clínica**:
Respostas da Anamnese que exigem cuidado antes de qualquer procedimento (alergias, marcapasso, gestação, medicamentos…), sempre exibidas no Prontuário e no registro do Atendimento.
_Avoid_: alerta (sozinho), contraindicação (é só um dos itens)

**Atendimento**:
O registro de uma sessão em que a Paciente foi atendida: nº da sessão, queixa, exame do dia, equipamento e ativos, evolução, intercorrências, orientações e os Procedimentos Realizados.
_Avoid_: consulta (no sentido de registro), visita

**Sessão**:
A ocorrência numerada de um mesmo Procedimento na Paciente ("5ª sessão de limpeza de pele"); é um atributo do Atendimento, não um registro próprio.

**Exame do dia**:
O que a Profissional observou no início de um Atendimento. Não confundir com Ficha de avaliação.
_Avoid_: avaliação

**Foto de acompanhamento**:
Imagem da Paciente registrada no Prontuário, datada e com área do corpo; pode estar ligada a um Atendimento ou ser avulsa.
_Avoid_: foto antes/depois (é só um uso possível)

**Autorização de uso de imagem**:
O consentimento da Paciente sobre suas fotos: apenas prontuário, prontuário e divulgação, ou recusada.
_Avoid_: termo de imagem, consentimento (sozinho)

**Procedimento**:
Um serviço do catálogo da clínica, com valor e duração padrão.
_Avoid_: serviço, tratamento

**Procedimento Realizado**:
Um Procedimento aplicado a uma Paciente dentro de um Atendimento, com o nome e o valor cobrados naquele dia.
_Avoid_: procedimento (quando se refere ao histórico)

**Prescrição**:
Lista de itens com posologia/orientação de uso indicada à Paciente; pode nascer de um Atendimento ou ser avulsa.
_Avoid_: receita (conflita com receita financeira), recomendação

## Pacotes e cupons

**Pacote**:
Combinação de Procedimentos do catálogo, cada um com uma quantidade de sessões, ofertada com um desconto em porcentagem. Enquanto não é contratado, o valor acompanha o catálogo.
_Avoid_: combo, kit, plano

**Pacote contratado**:
Um Pacote adquirido por uma Paciente, com itens, valores e desconto congelados no dia da contratação e, opcionalmente, prazo para usar as sessões.
_Avoid_: pacote vendido, assinatura

**Sessão do pacote**:
Procedimento Realizado em um Atendimento que consome uma sessão de um Pacote contratado; não é cobrado de novo.
_Avoid_: crédito, sessão paga

**Saldo do pacote**:
Sessões ainda disponíveis em um Pacote contratado, por procedimento.

**Cupom**:
Regra de desconto cadastrada pela clínica: porcentagem, prazo de uso após o envio e, opcionalmente, procedimentos em que vale e data final de envio. Nunca vale para Pacotes nem para Sessões do pacote.
_Avoid_: voucher, promoção

**Cupom emitido**:
O Cupom enviado a uma Paciente específica: código pessoal (ex.: LUME-7K3P9Q), de uso único, válido até o fim do prazo contado a partir do envio. Fica Disponível, Utilizado, Expirado ou Cancelado.
_Avoid_: cupom (sozinho, quando se refere ao código da paciente)

**Validação do cupom**:
Conferência presencial do código apresentado pela Paciente; o uso de fato acontece ao registrar o Atendimento.
_Avoid_: resgate

## Agenda

**Agendamento**:
Reserva de um horário para uma Paciente com um ou mais Procedimentos; sua duração é a soma das durações dos Procedimentos.
_Avoid_: consulta (no sentido de horário), reserva, marcação

**Conflito de horário**:
Dois Agendamentos ativos que se sobrepõem ou, sendo de Pacientes diferentes, não respeitam o Intervalo entre pacientes. Nunca é permitido.
_Avoid_: choque, sobreposição

**Horário de atendimento**:
Início e fim do expediente para cada dia da semana (ou dia fechado). Um Agendamento precisa começar e terminar dentro dele.
_Avoid_: expediente, disponibilidade

**Intervalo entre pacientes**:
Minutos livres obrigatórios entre o fim de um Agendamento e o início do próximo, quando são de Pacientes diferentes.
_Avoid_: buffer, folga

**Bloqueio de agenda**:
Período em que não se agenda — dias inteiros ou uma faixa de horário (feriado, férias, curso). Não altera agendamentos já marcados.
_Avoid_: folga, fechamento

**Status do Agendamento**:
Agendado, Confirmado, Realizado, Cancelado ou Faltou. Só se torna Realizado quando um Atendimento é registrado.

## Financeiro

**Lançamento**:
Entrada (receita) ou saída (despesa) de dinheiro, com data, valor, categoria e situação (pendente, pago, cancelado).
_Avoid_: transação, movimento

**Cobrança de Atendimento**:
O Lançamento de receita gerado a partir de um Atendimento, no valor total dos Procedimentos Realizados.

**Saldo do mês**:
Receitas pagas menos despesas pagas cujas datas caem no mês.

## Acesso

**PIN de acesso**:
Senha de 4 números que a Profissional cria no primeiro acesso e digita sempre que abre o painel naquele navegador. Vale para o navegador, não para os dados da clínica.
_Avoid_: senha, login, usuário

**Painel bloqueado**:
Estado em que nada do painel aparece até o PIN de acesso ser digitado. O painel começa bloqueado a cada acesso e pode ser bloqueado pela Profissional a qualquer momento.
_Avoid_: logout, sair

**Pausa de tentativas**:
Espera obrigatória depois de cinco PINs errados seguidos; dobra a cada nova série de erros.
_Avoid_: bloqueio de conta

## Registro de atividades

**Registro de atividade**:
Entrada imutável que descreve algo que aconteceu no painel: alteração de dados (com os campos antes/depois), acesso, navegação, evento do sistema ou erro.
_Avoid_: log de auditoria, histórico de alterações
