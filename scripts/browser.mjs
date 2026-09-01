/**
 * Resolves the Chromium that is already on this machine.
 *
 * The installed browser build (1208) predates the Playwright package version,
 * which expects a newer one, and downloading browsers is out of scope for this
 * project. Pointing Playwright at the existing binary keeps the screenshot and
 * icon scripts working without a download.
 */
import { chromium } from 'playwright'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const CANDIDATES = [
  process.env.CHROMIUM_PATH,
  join(
    process.env.LOCALAPPDATA ?? '',
    'ms-playwright/chromium-1208/chrome-win64/chrome.exe',
  ),
  join(
    process.env.LOCALAPPDATA ?? '',
    'ms-playwright/chromium_headless_shell-1208/chrome-headless-shell-win64/chrome-headless-shell.exe',
  ),
].filter(Boolean)

export async function launch(options = {}) {
  // Prefer whatever Playwright would pick on its own, if it is actually there.
  try {
    return await chromium.launch(options)
  } catch (err) {
    const executablePath = CANDIDATES.find((p) => existsSync(p))
    if (!executablePath) throw err
    return chromium.launch({ ...options, executablePath })
  }
}
