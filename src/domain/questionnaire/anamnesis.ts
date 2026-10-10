import type { Questionnaire } from './engine'

const FREQUENCY = ['Boa', 'Regular', 'Péssima']

/** Ficha de Anamnese Geral (dados pessoais ficam no cadastro da Paciente). */
export const ANAMNESIS: Questionnaire = {
  id: 'anamnesis',
  title: 'Ficha de Anamnese',
  sections: [
    {
      id: 'complaint',
      title: 'Queixa e objetivos',
      questions: [
        { id: 'complaint', type: 'textarea', label: 'Queixa principal', wide: true },
        { id: 'complaintDuration', type: 'text', label: 'Há quanto tempo?', placeholder: 'Ex.: 6 meses' },
        { id: 'goals', type: 'textarea', label: 'Objetivos e expectativas', wide: true },
      ],
    },
    {
      id: 'habits',
      title: 'Hábitos diários',
      questions: [
        { id: 'cosmetics', type: 'yesno', label: 'Utiliza cosméticos', detail: 'Quais?' },
        { id: 'sunExposure', type: 'yesno', label: 'Exposição ao sol', detail: 'Quanto tempo e frequência?' },
        { id: 'sunscreen', type: 'yesno', label: 'Utiliza filtro solar', detail: 'Frequência e tipo' },
        { id: 'smoking', type: 'yesno', label: 'Tabagismo', detail: 'Cigarros por dia' },
        { id: 'alcohol', type: 'yesno', label: 'Ingere bebida alcoólica', detail: 'Frequência' },
        { id: 'physicalActivity', type: 'yesno', label: 'Pratica atividade física', detail: 'Qual e frequência?' },
        { id: 'waterIntake', type: 'number', label: 'Ingestão de água', unit: 'copos/dia' },
        { id: 'sleepHours', type: 'number', label: 'Horas de sono por noite', unit: 'h' },
        { id: 'sleepQuality', type: 'choice', label: 'Qualidade do sono', options: FREQUENCY },
        { id: 'diet', type: 'choice', label: 'Alimentação', options: FREQUENCY },
        {
          id: 'bowel',
          type: 'choice',
          label: 'Funcionamento intestinal',
          options: ['1–2 vezes por semana', '3–4 vezes por semana', '1–2 vezes por dia', '3 ou mais vezes por dia'],
          wide: true,
        },
        { id: 'favoriteFoods', type: 'textarea', label: 'Alimentos de preferência', wide: true },
      ],
    },
    {
      id: 'medications',
      title: 'Medicamentos',
      questions: [
        {
          id: 'medications',
          type: 'list',
          label: 'Medicamentos em uso',
          alert: true,
          addLabel: 'Adicionar medicamento',
          wide: true,
          columns: [
            { id: 'name', label: 'Medicamento' },
            { id: 'dose', label: 'Quantidade e como toma' },
            { id: 'duration', label: 'Tempo de uso' },
            { id: 'notes', label: 'Observações' },
          ],
        },
      ],
    },
    {
      id: 'womensHealth',
      title: 'Saúde da mulher',
      audience: 'female',
      layout: 'checklist',
      questions: [
        { id: 'contraceptive', type: 'yesno', label: 'Uso de anticoncepcional', detail: 'Qual?' },
        { id: 'iud', type: 'yesno', label: 'Uso de DIU', detail: 'Qual?' },
        { id: 'pregnant', type: 'yesno', label: 'Gestante', alert: true },
        { id: 'breastfeeding', type: 'yesno', label: 'Amamentando', detail: 'Há quanto tempo?', alert: true },
        { id: 'pregnancies', type: 'yesno', label: 'Gestações anteriores', detail: 'Quantas e há quanto tempo?' },
        { id: 'lastPeriod', type: 'date', label: 'Primeiro dia da última menstruação' },
      ],
    },
    {
      id: 'clinicalHistory',
      title: 'Histórico clínico',
      layout: 'checklist',
      questions: [
        { id: 'previousAesthetic', type: 'yesno', label: 'Tratamento estético anterior', detail: 'Qual?' },
        { id: 'plasticSurgery', type: 'yesno', label: 'Cirurgia plástica estética', detail: 'Qual?' },
        { id: 'medicalTreatment', type: 'yesno', label: 'Tratamento médico atual', detail: 'Qual e com qual médico?' },
        { id: 'allergies', type: 'yesno', label: 'Antecedentes alérgicos', detail: 'Quais?', alert: true },
        { id: 'dentalImplant', type: 'yesno', label: 'Implante dentário', detail: 'Qual?' },
        { id: 'prosthesis', type: 'yesno', label: 'Prótese', detail: 'Qual?', alert: true },
        { id: 'pacemaker', type: 'yesno', label: 'Portador de marcapasso', detail: 'Há quanto tempo?', alert: true },
        { id: 'cardiac', type: 'yesno', label: 'Alterações cardíacas', detail: 'Quais?', alert: true },
        { id: 'bloodPressure', type: 'yesno', label: 'Hipo/hipertensão arterial', detail: 'Qual?', alert: true },
        { id: 'diabetes', type: 'yesno', label: 'Diabetes', detail: 'Tipo', alert: true },
        { id: 'circulatory', type: 'yesno', label: 'Distúrbio circulatório', detail: 'Qual?', alert: true },
        { id: 'renal', type: 'yesno', label: 'Distúrbio renal', detail: 'Qual?' },
        { id: 'hormonal', type: 'yesno', label: 'Distúrbio hormonal', detail: 'Qual?' },
        { id: 'gastrointestinal', type: 'yesno', label: 'Distúrbio gastrointestinal', detail: 'Qual?' },
        { id: 'epilepsy', type: 'yesno', label: 'Epilepsia / convulsões', detail: 'Frequência', alert: true },
        { id: 'fainting', type: 'yesno', label: 'Desmaios', detail: 'Frequência e data do último', alert: true },
        { id: 'psychological', type: 'yesno', label: 'Alterações psicológicas / psiquiátricas', detail: 'Quais?' },
        { id: 'stress', type: 'yesno', label: 'Estresse' },
        { id: 'oncological', type: 'yesno', label: 'Antecedentes oncológicos', detail: 'Qual e há quanto tempo?', alert: true },
        { id: 'otherDiseases', type: 'yesno', label: 'Outra doença pré-existente', detail: 'Qual?' },
      ],
    },
    {
      id: 'professional',
      title: 'Observações da profissional',
      questions: [
        { id: 'contraindications', type: 'textarea', label: 'Contraindicações observadas', alert: true, wide: true },
        { id: 'observations', type: 'textarea', label: 'Observações', wide: true },
      ],
    },
    {
      id: 'declaration',
      title: 'Declaração',
      questions: [
        {
          id: 'declarationConfirmed',
          type: 'check',
          label: 'A paciente declarou que não omitiu nenhuma informação e que estas são verdadeiras',
          wide: true,
        },
        { id: 'declarationDate', type: 'date', label: 'Data da declaração' },
      ],
    },
  ],
}
