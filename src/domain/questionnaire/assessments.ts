import type { Answers, Column, GridAnswer, Questionnaire } from './engine'
import { formatNumber, toNumber } from './engine'

const INTENSITY = ['+', '++', '+++', '++++']

const flaccidityGrid = (id: string) => ({
  id,
  type: 'grid' as const,
  label: 'Flacidez',
  hint: '+ leve · ++ moderada · +++ intensa · ++++ grave',
  rows: ['Tissular', 'Muscular'],
  rowHeader: 'Tipo',
  columns: [
    { id: 'grade', label: 'Grau', kind: 'select', options: INTENSITY },
    { id: 'site', label: 'Localização' },
  ] satisfies Column[],
  wide: true,
})

function bmi(answers: Answers) {
  const weight = toNumber(answers.body_weight)
  const height = toNumber(answers.body_height)
  if (!weight || !height) return undefined
  const value = weight / (height / 100) ** 2
  const range =
    value < 18.5 ? 'Abaixo do peso ideal'
    : value < 25 ? 'Peso normal'
    : value < 30 ? 'Sobrepeso'
    : value < 35 ? 'Obesidade grau I'
    : value < 40 ? 'Obesidade grau II'
    : 'Obesidade grau III'
  return `${formatNumber(Math.round(value * 10) / 10)} — ${range}`
}

function skinfoldSum(answers: Answers) {
  const grid = answers.body_skinfolds as GridAnswer | undefined
  if (!grid) return undefined
  const values = Object.values(grid).map((cells) => cells.mm).filter((v): v is number => typeof v === 'number')
  return values.length ? `${formatNumber(values.reduce((a, b) => a + b, 0))} mm` : undefined
}

export const FACIAL_ASSESSMENT: Questionnaire = {
  id: 'facial',
  title: 'Avaliação facial',
  sections: [
    {
      id: 'skin',
      title: 'Pele',
      questions: [
        { id: 'facial_fitzpatrick', type: 'choice', label: 'Fototipo cutâneo (Fitzpatrick)', options: ['I', 'II', 'III', 'IV', 'V', 'VI'] },
        { id: 'facial_biotype', type: 'choice', label: 'Biotipo cutâneo', options: ['Eudérmica', 'Lipídica', 'Alípica', 'Mista'] },
        { id: 'facial_ostia', type: 'choice', label: 'Óstios', options: ['Dilatados na zona T', 'Dilatados em toda a face', 'Contraídos'] },
        { id: 'facial_state', type: 'multi', label: 'Estado cutâneo', options: ['Normal', 'Desidratado', 'Sensibilizado', 'Acneico', 'Seborreico'] },
        { id: 'facial_texture', type: 'choice', label: 'Textura', options: ['Lisa', 'Áspera'] },
        { id: 'facial_thickness', type: 'choice', label: 'Espessura', options: ['Fina', 'Muito fina', 'Espessa'] },
      ],
    },
    {
      id: 'aging',
      title: 'Envelhecimento e acne',
      questions: [
        { id: 'facial_involution', type: 'multi', label: 'Involução cutânea', options: ['Linhas', 'Sulcos', 'Rugas', 'Elastose', 'Ptose'] },
        { id: 'facial_involutionSite', type: 'text', label: 'Local da involução' },
        { id: 'facial_glogau', type: 'choice', label: 'Fotoenvelhecimento (escala de Glogau)', options: ['I', 'II', 'III', 'IV', 'V'] },
        { id: 'facial_glogauNotes', type: 'text', label: 'Observações do fotoenvelhecimento' },
        { id: 'facial_acne', type: 'choice', label: 'Acne', options: ['Grau I', 'Grau II', 'Grau III', 'Grau IV', 'Grau V'] },
      ],
    },
    {
      id: 'alterations',
      title: 'Alterações',
      questions: [
        {
          id: 'facial_pigmentation',
          type: 'multi',
          label: 'Manchas pigmentares (melanina)',
          options: ['Acromia', 'Efélides', 'Hipocromia', 'Melanose', 'Hipercromia', 'Melanose solar'],
          other: true,
          wide: true,
        },
        {
          id: 'facial_vascular',
          type: 'multi',
          label: 'Alterações vasculares',
          options: ['Equimose', 'Petéquias', 'Telangiectasias', 'Eritema', 'Nevo rubi', 'Rosácea'],
          other: true,
          wide: true,
        },
        {
          id: 'facial_lesions',
          type: 'multi',
          label: 'Lesões de pele',
          options: ['Comedões', 'Pápula', 'Pústula', 'Milium', 'Cisto', 'Nódulo', 'Siringoma', 'Nevo melanocítico', 'Xantelasma', 'Dermatite', 'Ulceração', 'Hiperqueratose', 'Psoríase'],
          other: true,
          wide: true,
        },
        { id: 'facial_scar', type: 'multi', label: 'Cicatriz', options: ['Hipertrófica', 'Atrófica', 'Queloideana', 'Retrátil', 'Hipercrômica', 'Hipocrômica'], wide: true },
        { id: 'facial_hair', type: 'multi', label: 'Pelos', options: ['Hirsutismo', 'Hipertricose', 'Alopecia', 'Foliculite'], wide: true },
        { id: 'facial_darkCircles', type: 'yesno', label: 'Olheiras', detail: 'Tipo / observação' },
        flaccidityGrid('facial_flaccidity'),
      ],
    },
    {
      id: 'notes',
      title: 'Observações',
      questions: [{ id: 'facial_notes', type: 'textarea', label: 'Observações', wide: true }],
    },
  ],
}

export const BODY_ASSESSMENT: Questionnaire = {
  id: 'body',
  title: 'Avaliação corporal',
  sections: [
    {
      id: 'anthropometry',
      title: 'Antropometria',
      questions: [
        { id: 'body_weight', type: 'number', label: 'Peso', unit: 'kg' },
        { id: 'body_height', type: 'number', label: 'Altura', unit: 'cm' },
        { id: 'body_bmi', type: 'computed', label: 'IMC', compute: bmi },
        { id: 'body_minWeight', type: 'number', label: 'Peso mínimo', unit: 'kg' },
        { id: 'body_maxWeight', type: 'number', label: 'Peso máximo', unit: 'kg' },
      ],
    },
    {
      id: 'lipodystrophy',
      title: 'Lipodistrofia',
      questions: [
        { id: 'body_fat', type: 'choice', label: 'Gordura', options: ['Compacta', 'Flácida'] },
        { id: 'body_fatDistribution', type: 'choice', label: 'Distribuição de gordura', options: ['Localizada', 'Generalizada'] },
        { id: 'body_fatSite', type: 'text', label: 'Localização' },
        { id: 'body_biotype', type: 'choice', label: 'Biotipo', options: ['Ginoide', 'Androide', 'Normolíneo'] },
      ],
    },
    {
      id: 'hldg',
      title: 'Hidrolipodistrofia ginoide (HLDG)',
      questions: [
        { id: 'body_hldgType', type: 'choice', label: 'Tipo', options: ['Flácida', 'Edematosa', 'Compacta', 'Mista'] },
        { id: 'body_hldgGrade', type: 'choice', label: 'Grau', options: ['I', 'II', 'III', 'IV'] },
        { id: 'body_hldgSite', type: 'text', label: 'Localização' },
        { id: 'body_hldgColor', type: 'text', label: 'Coloração do tecido' },
        { id: 'body_hldgTemperature', type: 'choice', label: 'Temperatura', options: ['Fria', 'Quente'] },
        { id: 'body_hldgPain', type: 'yesno', label: 'Dor à palpação' },
      ],
    },
    {
      id: 'flaccidityStriae',
      title: 'Flacidez e estrias',
      questions: [
        flaccidityGrid('body_flaccidity'),
        { id: 'body_striaeColor', type: 'choice', label: 'Estrias — cor', options: ['Rubra/violácea', 'Alba'] },
        { id: 'body_striaeWidth', type: 'choice', label: 'Estrias — largura', options: ['Fina', 'Larga'] },
        { id: 'body_striaeType', type: 'choice', label: 'Estrias — tipo', options: ['Atrófica', 'Hipertrófica'] },
        { id: 'body_striaeAmount', type: 'choice', label: 'Estrias — quantidade', options: INTENSITY },
        { id: 'body_striaeRegion', type: 'text', label: 'Estrias — região', wide: true },
      ],
    },
    {
      id: 'perimetry',
      title: 'Perimetria',
      description: 'Medidas em centímetros. Para abdômen, tórax, braços e coxas: 5 cm acima, no ponto de referência e 5 cm abaixo.',
      questions: [
        {
          id: 'body_perimetry',
          type: 'grid',
          label: 'Perimetria',
          rowHeader: 'Medida',
          rows: ['Cintura', 'Quadril', 'Abdômen / flanco', 'Tórax', 'Braço direito', 'Braço esquerdo', 'Coxa direita', 'Coxa esquerda'],
          columns: [
            { id: 'plus5', label: '+5', kind: 'number', unit: 'cm' },
            { id: 'ref', label: 'Referência', kind: 'number', unit: 'cm' },
            { id: 'minus5', label: '−5', kind: 'number', unit: 'cm' },
          ],
          wide: true,
        },
      ],
    },
    {
      id: 'adipometry',
      title: 'Adipometria',
      questions: [
        {
          id: 'body_skinfolds',
          type: 'grid',
          label: 'Pregas cutâneas',
          rowHeader: 'Prega',
          rows: ['Supraescapular', 'Torácica', 'Suprailíaca', 'Axilar média', 'Abdominal', 'Bicipital', 'Tricipital', 'Coxa', 'Panturrilha medial'],
          columns: [{ id: 'mm', label: 'mm', kind: 'number', unit: 'mm' }],
          wide: true,
        },
        { id: 'body_skinfoldSum', type: 'computed', label: 'Somatória das pregas', compute: skinfoldSum },
        { id: 'body_fatPercent', type: 'number', label: '% de gordura', unit: '%' },
        { id: 'body_musclePercent', type: 'number', label: '% de músculo', unit: '%' },
        { id: 'body_skinfoldTechnique', type: 'text', label: 'Técnica utilizada' },
      ],
    },
    {
      id: 'notes',
      title: 'Observações',
      questions: [{ id: 'body_notes', type: 'textarea', label: 'Observações', wide: true }],
    },
  ],
}

export const HAIR_ASSESSMENT: Questionnaire = {
  id: 'hair',
  title: 'Avaliação capilar',
  sections: [
    {
      id: 'history',
      title: 'Histórico e hábitos',
      questions: [
        { id: 'hair_washing', type: 'text', label: 'Periodicidade e modo de lavar os cabelos', wide: true },
        { id: 'hair_cosmetics', type: 'textarea', label: 'Cosméticos capilares em uso', wide: true },
        { id: 'hair_preceding', type: 'multi', label: 'Nos meses que precederam o problema', options: ['Fez dietas', 'Emagreceu', 'Engordou', 'Teve crise emocional'], wide: true },
        { id: 'hair_familySame', type: 'yesno', label: 'Alguém da família tem ou teve o mesmo problema', detail: 'Quem?' },
        { id: 'hair_familyBaldness', type: 'text', label: 'Tipos de calvície na família' },
        {
          id: 'hair_pattern',
          type: 'choice',
          label: 'Padrão de calvície',
          hint: 'Mulheres: Ludwig / Olsen · Homens: Norwood',
          options: ['Ludwig 1', 'Ludwig 2', 'Ludwig 3', 'Olsen 1', 'Olsen 2', 'Olsen 3', 'Norwood I', 'Norwood II', 'Norwood IIa', 'Norwood III', 'Norwood IIIa', 'Norwood III vértex', 'Norwood IV', 'Norwood IVa', 'Norwood V', 'Norwood Va', 'Norwood VI', 'Norwood VII'],
          wide: true,
        },
        { id: 'hair_chemical', type: 'yesno', label: 'Faz química nos cabelos', detail: 'Qual e frequência?' },
        { id: 'hair_uses', type: 'multi', label: 'Usa', options: ['Gel', 'Boné/chapéu', 'Penteados presos', 'Escovação', 'Prancha térmica'], wide: true },
      ],
    },
    {
      id: 'exam',
      title: 'Exame físico',
      questions: [
        { id: 'hair_uniformDensity', type: 'yesno', label: 'Densidade igual em todo o couro cabeludo' },
        { id: 'hair_uniformLength', type: 'yesno', label: 'Comprimento igual em todas as regiões' },
        { id: 'hair_scalp', type: 'multi', label: 'O couro cabeludo apresenta', options: ['Oleosidade', 'Descamação', 'Prurido', 'Vermelhidão', 'Manchas', 'Caspa', 'Odor'], other: true, wide: true },
        { id: 'hair_presence', type: 'multi', label: 'Presença de', options: ['Falhas', 'Entradas', 'Retrações'] },
        { id: 'hair_presenceRegions', type: 'text', label: 'Em que regiões?' },
        { id: 'hair_regrowth', type: 'yesno', label: 'Existe reposição dos fios' },
        { id: 'hair_feel', type: 'multi', label: 'Os cabelos são', options: ['Macios', 'Ásperos', 'Brilhantes', 'Opacos'] },
        { id: 'hair_ends', type: 'choice', label: 'Pontas', options: ['Íntegras', 'Quebradiças'] },
        { id: 'hair_findings', type: 'multi', label: 'Nos fios foram encontrados', options: ['Nódulos', 'Triconodose', 'Tricorrexe nodosa', 'Tricoptilose'], other: true, wide: true },
      ],
    },
    {
      id: 'alopecia',
      title: 'Alopecia areata e/ou cicatricial',
      questions: [
        { id: 'hair_alopeciaSite', type: 'text', label: 'Localização' },
        { id: 'hair_alopeciaCount', type: 'number', label: 'Número de lesões' },
        { id: 'hair_alopeciaShape', type: 'text', label: 'Formato' },
        { id: 'hair_alopeciaSize', type: 'text', label: 'Tamanho' },
        { id: 'hair_alopeciaSurface', type: 'text', label: 'Superfície do couro cabeludo no local', wide: true },
      ],
    },
    {
      id: 'shaft',
      title: 'Haste capilar',
      questions: [
        { id: 'hair_color', type: 'choice', label: 'Cor', options: ['Preta', 'Castanha', 'Loura', 'Ruiva'] },
        { id: 'hair_natural', type: 'choice', label: 'Coloração', options: ['Natural', 'Colorido'] },
        { id: 'hair_type', type: 'choice', label: 'Tipo', options: ['Normal', 'Seco', 'Oleoso', 'Misto'] },
        { id: 'hair_length', type: 'choice', label: 'Comprimento', options: ['Curto', 'Médio', 'Longo'] },
        { id: 'hair_curl', type: 'choice', label: 'Curvatura', options: ['Liso', 'Ondulado', 'Crespo', 'Muito crespo'] },
        { id: 'hair_thickness', type: 'choice', label: 'Espessura', options: ['Fino', 'Médio', 'Grosso'] },
        { id: 'hair_density', type: 'choice', label: 'Densidade', options: ['Pouca', 'Média', 'Muita'] },
        { id: 'hair_porosity', type: 'choice', label: 'Porosidade', options: ['Pouco porosa', 'Porosa', 'Muito porosa'] },
        { id: 'hair_elasticity', type: 'choice', label: 'Elasticidade', options: ['Boa', 'Média', 'Ausente'] },
        { id: 'hair_complication', type: 'textarea', label: 'Complicações (fragilidade, falta de flexibilidade…)', wide: true },
        { id: 'hair_notes', type: 'textarea', label: 'Observação complementar', wide: true },
        { id: 'hair_finding', type: 'textarea', label: 'Alteração encontrada', wide: true },
      ],
    },
  ],
}

const volumeProduct: Column[] = [
  { id: 'volume', label: 'Volume', kind: 'number', unit: 'ml' },
  { id: 'product', label: 'Produto / lote' },
]

export const FACIAL_HARMONIZATION: Questionnaire = {
  id: 'facial_harmonization',
  title: 'Harmonização facial',
  sections: [
    {
      id: 'botox',
      title: 'Toxina botulínica',
      questions: [
        {
          id: 'harmf_botox',
          type: 'grid',
          label: 'Toxina botulínica',
          rowHeader: 'Local',
          rows: ['Glabela', 'Frontal', 'Orbicular (pés de galinha)', 'Rítides nasais', 'Depressor do septo nasal', 'Orbicular da boca', 'Sorriso gengival', 'Nefertiti', 'Hiperidrose'],
          columns: [
            { id: 'units', label: 'Unidades', kind: 'number', unit: 'U' },
            { id: 'return', label: 'Retorno' },
          ],
          wide: true,
        },
        { id: 'harmf_botoxProduct', type: 'text', label: 'Produto / lote da toxina', wide: true },
      ],
    },
    {
      id: 'filler',
      title: 'Preenchimento',
      questions: [
        {
          id: 'harmf_filler',
          type: 'grid',
          label: 'Preenchimento',
          rowHeader: 'Local',
          rows: ['Lábios', 'Linhas glabelares', 'Linhas periorbiculares', 'Malar', 'Mandíbula', 'Mento', 'Nariz', 'Olheiras', 'Temporal'],
          columns: volumeProduct,
          wide: true,
        },
      ],
    },
    {
      id: 'threads',
      title: 'Fios de PDO',
      questions: [
        {
          id: 'harmf_threads',
          type: 'grid',
          label: 'Fios de PDO',
          rowHeader: 'Local',
          rows: ['Linhas glabelares', 'Frontal', 'Temporal', 'Olheiras', 'Nariz', 'Malar', 'Linhas periorbiculares', 'Mento', 'Pescoço'],
          columns: [
            { id: 'quantity', label: 'Quantidade', kind: 'number' },
            { id: 'model', label: 'Modelo' },
          ],
          wide: true,
        },
      ],
    },
    {
      id: 'biostimulation',
      title: 'Bioestimulação',
      questions: [
        {
          id: 'harmf_biostim',
          type: 'grid',
          label: 'Bioestimulação',
          rowHeader: 'Local',
          rows: ['Terço superior da face', 'Terço médio da face', 'Terço inferior da face', 'Pescoço'],
          columns: volumeProduct,
          wide: true,
        },
        { id: 'harmf_notes', type: 'textarea', label: 'Observações', wide: true },
      ],
    },
  ],
}

export const BODY_HARMONIZATION: Questionnaire = {
  id: 'body_harmonization',
  title: 'Harmonização corporal',
  sections: [
    {
      id: 'application',
      title: 'Aplicação',
      questions: [
        { id: 'harmc_procedure', type: 'text', label: 'Procedimento', wide: true },
        {
          id: 'harmc_regions',
          type: 'grid',
          label: 'Regiões',
          rowHeader: 'Local',
          rows: ['Abdômen', 'Braços', 'Colo', 'Costas', 'Coxa anterior', 'Coxa interna', 'Coxa posterior', 'Flanco', 'Glúteo', 'Mama', 'Panturrilha'],
          columns: volumeProduct,
          wide: true,
        },
        { id: 'harmc_notes', type: 'textarea', label: 'Observações', wide: true },
      ],
    },
  ],
}
