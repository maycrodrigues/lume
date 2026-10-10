import { createBrowserRouter } from 'react-router'
import { AnamnesisPrintPage, AssessmentPrintPage } from '../features/assessments/QuestionnairePrintPage'
import { CouponsPage } from '../features/coupons/CouponsPage'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { PackagesPage } from '../features/packages/PackagesPage'
import { FinancePage } from '../features/finance/FinancePage'
import { ActivityPage } from '../features/activity/ActivityPage'
import { MedicalRecordPage } from '../features/medical-record/MedicalRecordPage'
import { PrescriptionPrintPage } from '../features/medical-record/PrescriptionPrintPage'
import { PatientsPage } from '../features/patients/PatientsPage'
import { ProceduresPage } from '../features/procedures/ProceduresPage'
import { SchedulePage } from '../features/schedule/SchedulePage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { NotFoundPage } from '../features/NotFoundPage'
import { AppShell } from '../layout/AppShell'
import { RouteError } from './RouteError'

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'agenda', element: <SchedulePage /> },
      { path: 'pacientes', element: <PatientsPage /> },
      { path: 'pacientes/:patientId', element: <MedicalRecordPage /> },
      { path: 'procedimentos', element: <ProceduresPage /> },
      { path: 'pacotes', element: <PackagesPage /> },
      { path: 'cupons', element: <CouponsPage /> },
      { path: 'financeiro', element: <FinancePage /> },
      { path: 'registros', element: <ActivityPage /> },
      { path: 'configuracoes', element: <SettingsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  { path: 'prescricoes/:prescriptionId/imprimir', element: <PrescriptionPrintPage />, errorElement: <RouteError /> },
  { path: 'pacientes/:patientId/anamnese/imprimir', element: <AnamnesisPrintPage />, errorElement: <RouteError /> },
  { path: 'fichas/:assessmentId/imprimir', element: <AssessmentPrintPage />, errorElement: <RouteError /> },
], {
  // Publicado em subpasta (ex.: GitHub Pages em /lume/): as rotas ficam relativas à base do build.
  basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/',
})
