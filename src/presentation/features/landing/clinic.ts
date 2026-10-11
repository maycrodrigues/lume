/**
 * Dados públicos da clínica exibidos na landing page.
 *
 * Os dados de Configurações ficam só no navegador da profissional, então a página pública
 * não consegue lê-los: preencha aqui. Campos vazios simplesmente não aparecem.
 */
export const CLINIC = {
  name: 'LUME · Estética & Cuidado Integrado',
  /** WhatsApp só com números, com DDI e DDD. Ex.: '5511912345678'. */
  whatsapp: '',
  whatsappMessage: 'Olá! Gostaria de agendar uma avaliação na LUME.',
  /** Usuário do Instagram, sem @. */
  instagram: '',
  email: '',
  /** Ex.: 'Rua das Flores, 123 · Moema · São Paulo/SP'. */
  address: '',
  /** Mantenha igual ao horário de atendimento configurado no painel. */
  hours: [
    { days: 'Segunda a sexta', time: '10h às 17h' },
    { days: 'Sábado', time: '12h às 16h' },
  ],
}

/** Link do botão "Agendar avaliação": WhatsApp, se configurado; senão, a seção de contato. */
export const bookingLink = CLINIC.whatsapp
  ? { href: `https://wa.me/${CLINIC.whatsapp}?text=${encodeURIComponent(CLINIC.whatsappMessage)}`, external: true }
  : { href: '#contato', external: false }
