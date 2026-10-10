import { describe, expect, it } from 'vitest'
import { at, imageFile, seedBasics, setup } from './setup'

describe('Fotos de acompanhamento', () => {
  it('adiciona foto ligada ao atendimento e recupera a imagem', async () => {
    const { services } = setup()
    const { maria, limpeza } = await seedBasics(services)
    const { consultation } = await services.consultations.register({ patientId: maria.id, date: at('2026-10-10T08:00'), procedures: [{ procedureId: limpeza.id, price: 100 }] })

    const photo = await services.photos.add({ patientId: maria.id, consultationId: consultation.id, takenAt: '2026-10-10', region: 'Face — frontal', file: imageFile([9, 8, 7]) })

    expect(photo).toMatchObject({ width: 800, height: 600, size: 3, region: 'Face — frontal' })
    const blob = await services.photos.file(photo.fileId)
    expect([...new Uint8Array(await blob!.arrayBuffer())]).toEqual([9, 8, 7])
    const record = await services.medicalRecords.get(maria.id)
    expect(record.photos.map((p) => p.id)).toEqual([photo.id])
    const [log] = await services.activity.query({ entity: 'photo' })
    expect(log.message).toBe('Cadastro de foto: Maria Souza · 10/10/2026 · Face — frontal')
  })

  it('recusa arquivo que não é imagem, sem gravar nada', async () => {
    const { services } = setup()
    const { maria } = await seedBasics(services)
    await expect(
      services.photos.add({ patientId: maria.id, takenAt: '2026-10-10', file: new Blob(['x'], { type: 'application/pdf' }) }),
    ).rejects.toThrow('não é uma imagem')
    expect((await services.medicalRecords.get(maria.id)).photos).toEqual([])
  })

  it('excluir a foto remove também os arquivos', async () => {
    const { services } = setup()
    const { maria } = await seedBasics(services)
    const photo = await services.photos.add({ patientId: maria.id, takenAt: '2026-10-10', file: imageFile() })
    await services.photos.remove(photo.id)
    expect(await services.photos.file(photo.fileId)).toBeUndefined()
    expect(await services.photos.file(photo.thumbnailId)).toBeUndefined()
  })

  it('excluir o atendimento mantém as fotos e fichas no prontuário', async () => {
    const { services } = setup()
    const { maria, limpeza } = await seedBasics(services)
    const { consultation } = await services.consultations.register({ patientId: maria.id, date: at('2026-10-10T08:00'), procedures: [{ procedureId: limpeza.id, price: 100 }] })
    await services.photos.add({ patientId: maria.id, consultationId: consultation.id, takenAt: '2026-10-10', file: imageFile() })
    await services.assessments.create({ patientId: maria.id, template: 'facial_harmonization', consultationId: consultation.id, date: '2026-10-10', answers: {} })

    await services.consultations.remove(consultation.id)

    const record = await services.medicalRecords.get(maria.id)
    expect(record.photos).toHaveLength(1)
    expect(record.photos[0].consultationId).toBeUndefined()
    expect(record.assessments[0].consultationId).toBeUndefined()
  })

  it('paciente com fotos não pode ser excluída', async () => {
    const { services } = setup()
    const { maria } = await seedBasics(services)
    await services.photos.add({ patientId: maria.id, takenAt: '2026-10-10', file: imageFile() })
    await expect(services.patients.remove(maria.id)).rejects.toThrow('histórico')
  })

  it('backup inclui as imagens e as restaura byte a byte', async () => {
    const { services } = setup()
    const { maria } = await seedBasics(services)
    const photo = await services.photos.add({ patientId: maria.id, takenAt: '2026-10-10', file: imageFile([0, 128, 255]) })
    const file = JSON.parse(JSON.stringify(await services.backup.exportData()))

    await services.backup.clearAll()
    expect(await services.photos.file(photo.fileId)).toBeUndefined()
    await services.backup.importData(file)

    const blob = await services.photos.file(photo.fileId)
    expect([...new Uint8Array(await blob!.arrayBuffer())]).toEqual([0, 128, 255])
  })
})
