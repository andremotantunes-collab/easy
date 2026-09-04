/**
 * Folds the preview build into one HTML file, in one of two shapes.
 *
 *   npm run preview:build   -> .tmp/easy-preview.html, para publicar como
 *                              Artifact: so' o conteudo da pagina, porque o
 *                              anfitriao poe o <head> e o <body> a' volta.
 *
 *   npm run offline         -> Easy.html, um documento completo para guardar
 *                              no telemovel e abrir sem rede nem servidor.
 *
 * Nos dois casos o CSS e o JS vao inline e nao ha um unico pedido a' rede: e'
 * essa a condicao para funcionar dentro de um artifact e para funcionar a
 * partir do sistema de ficheiros.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DIR = '.tmp/preview-build/assets'
const completo = process.argv.includes('--completo')
const destino =
  process.argv.find((a) => !a.startsWith('--') && a.endsWith('.html')) ??
  (completo ? 'Easy.html' : '.tmp/easy-preview.html')

const files = readdirSync(DIR)
const js = readFileSync(join(DIR, files.find((f) => f.endsWith('.js'))), 'utf8')
const css = readFileSync(join(DIR, files.find((f) => f.endsWith('.css'))), 'utf8')

// `</script` dentro do proprio codigo fecharia o <script> que o embrulha. A
// barra invertida tem de chegar ao ficheiro, e por isso e' que sao duas aqui:
// escrita com uma so', a substituicao trocava a sequencia por ela mesma.
const codigo = js.replaceAll('</script', '<\\/script')

const DESCRICAO = 'Easy. — quanto tens, mesmo, para gastar este mes.'

/* O mesmo arranque de tema do index.html: aplicado antes do primeiro pixel,
   para a app nao abrir com o tema do sistema e trocar a seguir. */
const ARRANQUE_TEMA = `;(function () {
  try {
    var escolha = localStorage.getItem('easy.theme.v1')
    if (escolha !== 'light' && escolha !== 'dark') return
    document.documentElement.setAttribute('data-theme', escolha)
    var meta = document.createElement('meta')
    meta.name = 'theme-color'
    meta.setAttribute('data-easy-barra', '')
    meta.content = escolha === 'dark' ? '#07070E' : '#F6F8FC'
    document.head.insertBefore(meta, document.head.firstChild)
  } catch (e) {}
})()`

const paginaArtifact = () => `<title>Easy.</title>
<meta name="description" content="${DESCRICAO}" />
<style>
${css}
</style>
<script>
${ARRANQUE_TEMA}
</script>
<div id="root"></div>
<script type="module">
${codigo}
</script>
`

const documentoCompleto = () => {
  // Os icones entram em data: URI — um <link> para um ficheiro ao lado nao
  // sobrevive a passar o HTML sozinho para o telemovel.
  //
  // E sao DOIS, de tipos diferentes, de proposito. O separador do browser fica
  // com o SVG, que escala. O atalho no ecra principal TEM de levar um PNG: o
  // Safari do iPhone ignora um apple-touch-icon em SVG e poe uma miniatura da
  // pagina no lugar do icone — que foi exatamente o que aconteceu.
  const icone = readFileSync('public/favicon.svg', 'utf8')
  const iconeURI = `data:image/svg+xml;base64,${Buffer.from(icone, 'utf8').toString('base64')}`
  const png = (ficheiro) =>
    `data:image/png;base64,${readFileSync(`public/icons/${ficheiro}`).toString('base64')}`
  const atalhoURI = png('icon-180.png')
  return `<!doctype html>
<html lang="pt-PT">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=5"
    />
    <title>Easy.</title>
    <meta name="description" content="${DESCRICAO}" />
    <link rel="icon" type="image/svg+xml" href="${iconeURI}" />
    <link rel="icon" type="image/png" sizes="180x180" href="${atalhoURI}" />
    <link rel="apple-touch-icon" sizes="180x180" href="${atalhoURI}" />
    <meta name="theme-color" content="#F6F8FC" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#07070E" media="(prefers-color-scheme: dark)" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Easy." />
    <script>
${ARRANQUE_TEMA}
    </script>
    <style>
${css}
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module">
${codigo}
    </script>
  </body>
</html>
`
}

const html = completo ? documentoCompleto() : paginaArtifact()
writeFileSync(destino, html)
console.log(
  `${destino} — ${(Buffer.byteLength(html) / 1024).toFixed(0)} kB, ${completo ? 'documento completo' : 'pagina de artifact'}`,
)
