/**
 * Guardar um ficheiro que ja' esta' no dispositivo.
 *
 * Um `<a download>` criado a` mao, clicado, e deitado fora. Nada disto toca na
 * rede: o blob veio do IndexedDB do proprio telemovel e volta para o disco do
 * proprio telemovel. O `revokeObjectURL` fica adiado porque o Safari do iOS
 * ainda esta' a ler o URL quando o `click()` ja' regressou — revoga'-lo a
 * seguir dava um descarregamento vazio.
 */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
