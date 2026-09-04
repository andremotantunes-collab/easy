import { Suspense, lazy, useEffect, useState, type ComponentType } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { TabBar } from './components/Layout'
import { Inicio } from './screens/Inicio'
import { Bloqueio } from './screens/Bloqueio'
import { hasOnboarded } from './lib/storage'
import { useProfile } from './store/profile'
import { useBudget } from './store/budget'
import { useHistorico } from './store/historico'
import { compute } from './lib/finance'
import { limparFaturasOrfas } from './lib/docs'
import { faturasReclamadas } from './lib/gastos'
import { BUDGET_KEY } from './lib/storage'
import { ligarSwipe, seccaoAtual, type Sentido } from './lib/swipe'

/**
 * O Inicio e o Bloqueio vem no primeiro pacote porque sao os dois ecras que
 * podem ser o primeiro a aparecer. Todos os outros so' chegam quando alguem
 * la' vai — e' menos JavaScript para descarregar e compilar antes de o ecra
 * inicial ficar de pe'. Os dois destinos da barra sao pedidos assim que o
 * telemovel fica quieto, para que um toque nunca espere por um ficheiro.
 */
const Documentos = carregar(() => import('./screens/Documentos'), 'Documentos')
const Perfil = carregar(() => import('./screens/Perfil'), 'Perfil')
const DadosPessoais = carregar(() => import('./screens/DadosPessoais'), 'DadosPessoais')
const Plano = carregar(() => import('./screens/Plano'), 'Plano')
const Fixas = carregar(() => import('./screens/Fixas'), 'Fixas')
const Investir = carregar(() => import('./screens/Investir'), 'Investir')
const Definicoes = carregar(() => import('./screens/Definicoes'), 'Definicoes')
const Gastos = carregar(() => import('./screens/Gastos'), 'Gastos')
const Meses = carregar(() => import('./screens/Meses'), 'Meses')
const Onboarding = carregar(() => import('./screens/Onboarding'), 'Onboarding')

// Os ecras sao exportacoes com nome; `lazy` quer uma exportacao por omissao.
function carregar<K extends string>(
  importar: () => Promise<Record<K, ComponentType>>,
  nome: K,
) {
  return lazy(() => importar().then((m) => ({ default: m[nome] })))
}

const FULLSCREEN = ['/inicio']

export default function App() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const bloqueado = useProfile((s) => s.bloqueado)
  // Guarda o caminho A QUE a animacao pertence, e nao so' o sentido: assim um
  // toque na barra — que muda de seccao sem sentido nenhum — nao herda a
  // animacao do arrasto anterior, e nao e' preciso um efeito a limpa'-la (que
  // a apagava a meio, por correr logo a seguir a` navegacao).
  const [entrada, setEntrada] = useState<{ caminho: string; sentido: Sentido } | null>(null)
  const budget = useBudget((s) => s.budget)
  const abrirMes = useHistorico((s) => s.abrir)
  const chromeless = FULLSCREEN.includes(pathname)

  // A sub-page always opens at the top, never halfway down the page you left.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  // Um mes fecha na primeira abertura depois de virar. Nao ha servidor nem
  // tarefa de fundo: e' aqui, ao arrancar, ou nao e' em lado nenhum.
  useEffect(() => {
    abrirMes((mes) => compute(budget, mes))
    // De proposito so' ao montar: o plano do momento e' o que fica no registo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Varre as faturas sem dono, uma vez por arranque.
   *
   * A guarda nao e' decoracao: com o `localStorage` inacessivel — janela
   * privada, quota cheia — o orcamento em memoria e' o de omissao, sem gastos
   * nenhuns, e varrer com essa lista apagava TODAS as faturas do utilizador.
   * So' se varre depois de confirmar que ha' mesmo um orcamento no disco.
   */
  useEffect(() => {
    let temDisco = false
    try {
      temDisco = localStorage.getItem(BUDGET_KEY) !== null
    } catch {
      temDisco = false
    }
    if (!temDisco) return
    void limparFaturasOrfas(faturasReclamadas(useBudget.getState().budget.gastos))
    // Só ao montar: a meio de uma sessão os caminhos que largam bilhetes já
    // limpam atrás de si, e varrer outra vez seria correr contra eles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Os separadores sao pedidos com o telemovel quieto, depois de o Inicio
  // estar pintado. Quem toca em Documentos ou Perfil ja' os encontra em casa.
  useEffect(() => {
    const buscar = () => {
      void import('./screens/Gastos')
      void import('./screens/Documentos')
      void import('./screens/Perfil')
    }
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(buscar, { timeout: 3000 })
      return () => cancelIdleCallback(id)
    }
    const id = setTimeout(buscar, 1200)
    return () => clearTimeout(id)
  }, [])

  /**
   * Arrastar de lado troca de separador.
   *
   * Os ouvintes ligam-se uma vez e nao a cada navegacao: reata'-los a meio
   * perdia o gesto em curso, porque o `touchstart` tinha sido apanhado pelo
   * ouvinte anterior e o `touchend` cairia no novo, sem inicio guardado. E'
   * tambem por isso que o gesto le' o endereco por si em vez de receber o
   * caminho de fora.
   */
  useEffect(() => {
    if (bloqueado) return
    return ligarSwipe((destino, dir) => {
      setEntrada({ caminho: destino, sentido: dir })
      navigate(destino)
    })
  }, [bloqueado, navigate])

  // Com a app em segundo plano nao ha nada para ver: o campo de luz para, em
  // vez de continuar a compor camadas contra a bateria.
  useEffect(() => {
    const marcar = () => document.body.classList.toggle('pausado', document.hidden)
    document.addEventListener('visibilitychange', marcar)
    marcar()
    return () => document.removeEventListener('visibilitychange', marcar)
  }, [])

  // The lock is a gate in front of the router, not a route: there is no URL
  // that gets past it, and nothing behind it renders while it is up.
  if (bloqueado) return <Bloqueio />

  return (
    <>
      <div className="aurora" aria-hidden>
        <div className="aurora-campo aurora-1" />
        <div className="aurora-campo aurora-2" />
      </div>
      {/* Sem indicador de espera de proposito: os pacotes sao pequenos e ja'
          vem pedidos de antemao, e um pisca-pisca a cada toque seria pior do
          que o frame que ele tapa. */}
      {/* A chave e' o caminho para a animacao voltar a correr a cada troca —
          uma classe que ja' la' esta' nao reinicia sozinha. */}
      <div
        key={pathname}
        className={
          // A comparacao e' pela mesma regra que o gesto usa: publicada, a app
          // vive em /easy/ e o `pathname` do router nao e' o mesmo texto.
          entrada?.caminho === seccaoAtual()
            ? entrada.sentido === 'esquerda'
              ? 'seccao-esquerda'
              : 'seccao-direita'
            : undefined
        }
      >
      <Suspense fallback={null}>
        <Routes>
          <Route
            path="/"
            element={hasOnboarded() ? <Inicio /> : <Navigate to="/inicio" replace />}
          />
          {/* Feito o onboarding, /inicio deixa de existir: um refresh, um
              "voltar" ou um atalho antigo iam repetir os dois passos. */}
          <Route
            path="/inicio"
            element={hasOnboarded() ? <Navigate to="/" replace /> : <Onboarding />}
          />
          <Route path="/documentos" element={<Documentos />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/perfil/dados" element={<DadosPessoais />} />
          <Route path="/plano" element={<Plano />} />
          <Route path="/fixas" element={<Fixas />} />
          <Route path="/gastos" element={<Gastos />} />
          <Route path="/meses" element={<Meses />} />
          <Route path="/investir" element={<Investir />} />
          <Route path="/definicoes" element={<Definicoes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      </div>
      {chromeless ? null : <TabBar />}
    </>
  )
}
