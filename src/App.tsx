import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { TabBar } from './components/Layout'
import { Inicio } from './screens/Inicio'
import { Plano } from './screens/Plano'
import { Fixas } from './screens/Fixas'
import { Investir } from './screens/Investir'
import { Documentos } from './screens/Documentos'
import { Definicoes } from './screens/Definicoes'
import { Onboarding } from './screens/Onboarding'
import { hasOnboarded } from './lib/storage'

const FULLSCREEN = ['/inicio']

export default function App() {
  const { pathname } = useLocation()
  const chromeless = FULLSCREEN.includes(pathname)

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={hasOnboarded() ? <Inicio /> : <Navigate to="/inicio" replace />}
        />
        <Route path="/inicio" element={<Onboarding />} />
        <Route path="/plano" element={<Plano />} />
        <Route path="/fixas" element={<Fixas />} />
        <Route path="/investir" element={<Investir />} />
        <Route path="/documentos" element={<Documentos />} />
        <Route path="/definicoes" element={<Definicoes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {chromeless ? null : <TabBar />}
    </>
  )
}
