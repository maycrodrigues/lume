import { ButtonLink } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'

export function NotFoundPage() {
  return <EmptyState title="Página não encontrada" description="O endereço acessado não existe no painel." action={<ButtonLink to="/admin">Voltar ao painel</ButtonLink>} />
}
