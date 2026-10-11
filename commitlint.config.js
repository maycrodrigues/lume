/**
 * Conventional Commits: <tipo>(<escopo opcional>): <descrição em minúsculas>
 * Tipos: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
 * Ex.: feat(agenda): mostra só horários livres no agendamento
 */
export default {
  extends: ['@commitlint/config-conventional'],
  helpUrl: 'https://www.conventionalcommits.org/pt-br/v1.0.0/',
}
