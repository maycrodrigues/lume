import type { ComponentType } from 'react'
import { createBrowserRouter, redirect } from 'react-router'
import type { Services } from '@/application'
import { LandingPage } from '../features/landing/LandingPage'
import { RouteError } from './RouteError'

export type LoadServices = () => Promise<Services>

/** Carrega a tela só quando a rota é acessada (o painel não pesa na landing page). */
const screen =
  <M,>(load: () => Promise<M>, pick: (module: M) => ComponentType) =>
  async () => ({ Component: pick(await load()) })

/** Seções do painel, para redirecionar endereços antigos (antes do painel ir para /admin). */
const ADMIN_SECTIONS = ['agenda', 'pacientes', 'procedimentos', 'pacotes', 'cupons', 'financeiro', 'registros', 'configuracoes', 'prescricoes', 'fichas']

export function createAppRouter(loadServices: LoadServices) {
  const logError = (error: unknown) => {
    void loadServices().then((services) => services.activity.recordError(error, { source: 'route', path: location.pathname }))
  }

  return createBrowserRouter(
    [
      { index: true, element: <LandingPage />, errorElement: <RouteError home="/" /> },
      {
        path: 'admin',
        lazy: async () => {
          const [services, { AdminRoot }] = await Promise.all([loadServices(), import('./AdminRoot')])
          return { element: <AdminRoot services={services} /> }
        },
        hydrateFallbackElement: <div className="min-h-dvh bg-noite" />,
        errorElement: <RouteError home="/admin" onError={logError} />,
        children: [
          {
            lazy: screen(() => import('../layout/AppShell'), (m) => m.AppShell),
            errorElement: <RouteError home="/admin" onError={logError} />,
            children: [
              { index: true, lazy: screen(() => import('../features/dashboard/DashboardPage'), (m) => m.DashboardPage) },
              { path: 'agenda', lazy: screen(() => import('../features/schedule/SchedulePage'), (m) => m.SchedulePage) },
              { path: 'pacientes', lazy: screen(() => import('../features/patients/PatientsPage'), (m) => m.PatientsPage) },
              { path: 'pacientes/:patientId', lazy: screen(() => import('../features/medical-record/MedicalRecordPage'), (m) => m.MedicalRecordPage) },
              { path: 'procedimentos', lazy: screen(() => import('../features/procedures/ProceduresPage'), (m) => m.ProceduresPage) },
              { path: 'pacotes', lazy: screen(() => import('../features/packages/PackagesPage'), (m) => m.PackagesPage) },
              { path: 'cupons', lazy: screen(() => import('../features/coupons/CouponsPage'), (m) => m.CouponsPage) },
              { path: 'financeiro', lazy: screen(() => import('../features/finance/FinancePage'), (m) => m.FinancePage) },
              { path: 'registros', lazy: screen(() => import('../features/activity/ActivityPage'), (m) => m.ActivityPage) },
              { path: 'configuracoes', lazy: screen(() => import('../features/settings/SettingsPage'), (m) => m.SettingsPage) },
              { path: '*', lazy: screen(() => import('../features/NotFoundPage'), (m) => m.NotFoundPage) },
            ],
          },
          { path: 'prescricoes/:prescriptionId/imprimir', lazy: screen(() => import('../features/medical-record/PrescriptionPrintPage'), (m) => m.PrescriptionPrintPage) },
          { path: 'pacientes/:patientId/anamnese/imprimir', lazy: screen(() => import('../features/assessments/QuestionnairePrintPage'), (m) => m.AnamnesisPrintPage) },
          { path: 'fichas/:assessmentId/imprimir', lazy: screen(() => import('../features/assessments/QuestionnairePrintPage'), (m) => m.AssessmentPrintPage) },
        ],
      },
      {
        // Endereços antigos do painel (ex.: /agenda) vão para /admin/agenda; o resto, para a landing page.
        path: '*',
        loader: ({ params }) => {
          const rest = params['*'] ?? ''
          throw redirect(ADMIN_SECTIONS.includes(rest.split('/')[0]) ? `/admin/${rest}` : '/')
        },
      },
    ],
    {
      // Publicado em subpasta (ex.: GitHub Pages em /lume/): as rotas ficam relativas à base do build.
      basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/',
    },
  )
}
