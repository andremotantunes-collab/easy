/**
 * Publica a app no GitHub Pages, em /easy/.
 *
 * Compila com o prefixo certo, deixa um 404.html igual ao index — é assim que
 * o Pages devolve a app quando se recarrega um caminho fundo como /easy/gastos
 * — e empurra o resultado para o ramo `gh-pages`. O código-fonte fica no
 * `master`; aqui vai só o que o browser precisa.
 *
 * Corre: npm run deploy
 */
import { execFileSync } from 'node:child_process'
import { cpSync, rmSync, writeFileSync, copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const REPO = 'https://github.com/andremotantunes-collab/easy.git'
const PREFIXO = '/easy/'
const SAIDA = join('.tmp', 'pages')

// No Windows o `npm` e' um .cmd e precisa de shell; o `git` e' um executavel
// e nao pode leva'-lo — com shell, os argumentos perdem as aspas e uma
// mensagem de commit com espacos parte-se em pedacos.
const corre = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { stdio: 'inherit', ...opts })

const correNpm = (args, opts = {}) =>
  execFileSync('npm', args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  })

console.log(`\nA compilar com base ${PREFIXO}`)
correNpm(['run', 'build'], { env: { ...process.env, BASE_PATH: PREFIXO } })

// O Pages serve 404.html quando o caminho não existe como ficheiro. Sendo uma
// cópia do index, a app arranca e o router trata do resto.
copyFileSync(join('dist', 'index.html'), join('dist', '404.html'))

rmSync(SAIDA, { recursive: true, force: true })
mkdirSync(SAIDA, { recursive: true })
cpSync('dist', SAIDA, { recursive: true })
// Sem isto o Jekyll do Pages ignora ficheiros e pastas começados por _.
writeFileSync(join(SAIDA, '.nojekyll'), '')

const git = (...args) => corre('git', ['-C', SAIDA, ...args])
git('init', '-q')
git('checkout', '-q', '-B', 'gh-pages')
git('config', 'user.name', 'Easy Build')
git('config', 'user.email', 'x.opscorp@gmail.com')
git('add', '-A')
git('commit', '-q', '-m', `Publicar a app em ${PREFIXO}`)
git('push', '-q', '-f', REPO, 'gh-pages')

console.log('\nNo ar: https://andremotantunes-collab.github.io/easy/')
console.log('Pode demorar até um minuto a atualizar.\n')
