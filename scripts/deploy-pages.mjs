/**
 * Publica a app.
 *
 * Publicar é enviar: o GitHub compila e põe no ar sozinho a cada envio para o
 * `master`, com os testes pelo caminho (ver .github/workflows/publicar.yml).
 * Este guião só existe para não ser preciso decorar isso — envia, espera pela
 * publicação, e diz como correu.
 *
 * Corre: npm run deploy
 */
import { execFileSync } from 'node:child_process'

const REPO = 'andremotantunes-collab/easy'
const SITE = 'https://andremotantunes-collab.github.io/easy/'

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
const espera = (ms) => new Promise((r) => setTimeout(r, ms))

const porCommitar = git('status', '--porcelain')
if (porCommitar) {
  console.error('\nHá alterações por guardar. Faz o commit primeiro:\n')
  console.error(porCommitar.split('\n').slice(0, 10).join('\n'))
  process.exit(1)
}

console.log('\nA enviar para o GitHub…')
execFileSync('git', ['push', 'origin', 'HEAD'], { stdio: 'inherit' })

// O `gh` é opcional: sem ele, o envio já chegou e o resto acontece na mesma.
let temGh = true
try {
  execFileSync('gh', ['--version'], { stdio: 'ignore' })
} catch {
  temGh = false
}
if (!temGh) {
  console.log(`\nEnviado. O site atualiza-se dentro de um minuto: ${SITE}\n`)
  process.exit(0)
}

console.log('A aguardar a publicação…')
await espera(5000)
const corridas = JSON.parse(
  execFileSync('gh', ['run', 'list', '--repo', REPO, '--limit', '1', '--json', 'databaseId,status'], {
    encoding: 'utf8',
  }),
)
if (corridas.length === 0) {
  console.log(`\nEnviado. O site atualiza-se dentro de um minuto: ${SITE}\n`)
  process.exit(0)
}

try {
  execFileSync('gh', ['run', 'watch', String(corridas[0].databaseId), '--repo', REPO, '--exit-status'], {
    stdio: 'inherit',
  })
  console.log(`\nNo ar: ${SITE}\n`)
} catch {
  console.error('\nA publicação falhou. O site continua na versão anterior.')
  console.error(`Vê o que correu mal: gh run view ${corridas[0].databaseId} --repo ${REPO} --log-failed\n`)
  process.exit(1)
}
