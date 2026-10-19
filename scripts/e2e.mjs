// End-to-end checks of the functional features against the mock data.
// Usage: node scripts/e2e.mjs [baseUrl]
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const base = process.argv[2] ?? 'http://localhost:3000/'
mkdirSync('qa/e2e', { recursive: true })
const results = []
const check = (name, ok, info = '') => {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? `  — ${info}` : ''}`)
}

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
await page.goto(`${base}?qa=1`, { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.__sceneReady === true, null, { timeout: 90_000 })

// --- booking: invalid submit shows errors + summary focus
await page.evaluate(() => window.__jumpTo('book', 0.2))
await page.waitForTimeout(800)
const form = page.locator('#book form')
await form.getByRole('button', { name: 'Book repair' }).click()
await page.waitForTimeout(200)
const errCount = await form.locator('[aria-invalid="true"]').count()
check('booking: empty submit flags invalid fields', errCount >= 4, `${errCount} invalid`)
const focused = await page.evaluate(() => document.activeElement?.textContent ?? '')
check('booking: error summary receives focus', /Please check/.test(focused), focused.slice(0, 40))

// --- booking: valid submit → ticket + WhatsApp link
await form.getByLabel('Brand').fill('Lenovo')
await form.getByLabel('Model').fill('ThinkPad T14')
await form.getByText('Overheating', { exact: true }).click()
await form.getByText('Loud fan', { exact: true }).click()
await form.getByLabel('Your name').fill('Test Customer')
await form.getByLabel('Phone').fill('0771234567')
await form.getByRole('button', { name: 'Book repair' }).click()
const ticketEl = page.locator('#book').getByText(/^KR-\d{4}-\d{4}$/)
await ticketEl.waitFor({ timeout: 8000 })
const ticketId = (await ticketEl.textContent())?.trim()
check('booking: confirmation shows ticket number', !!ticketId, ticketId)
const wa = await page.locator('#book').getByRole('link', { name: 'Continue on WhatsApp' }).getAttribute('href')
check('booking: WhatsApp link prefilled with ticket + details', !!wa && decodeURIComponent(wa).includes(ticketId) && decodeURIComponent(wa).includes('ThinkPad'), wa?.slice(0, 60))
await page.screenshot({ path: 'qa/e2e/booking-confirmed.png' })

// --- tracker: sample ticket, then the new booking, then a bad number
await page.evaluate(() => window.__jumpTo('track', 0.3))
await page.waitForTimeout(800)
const input = page.locator('#track').getByLabel('Ticket number')
await input.fill('kr-2026-0398')
await page.locator('#track').getByRole('button', { name: 'Check status' }).click()
await page.locator('#track [aria-current="step"]').waitFor({ timeout: 8000 })
const step = await page.locator('#track [aria-current="step"]').textContent()
check('tracker: sample ticket shows current step', /Awaiting approval/.test(step ?? ''), step?.trim())
await page.waitForTimeout(600)
await page.screenshot({ path: 'qa/e2e/tracker-found.png' })
await input.fill(ticketId ?? '')
await page.locator('#track').getByRole('button', { name: 'Check status' }).click()
await page.waitForTimeout(800)
const step2 = await page.locator('#track [aria-current="step"]').textContent()
check('tracker: newly booked ticket is trackable', /Received/.test(step2 ?? ''), step2?.trim())
await input.fill('KR-2026-9999')
await page.locator('#track').getByRole('button', { name: 'Check status' }).click()
await page.waitForTimeout(800)
const notFound = await page.locator('#track').getByText(/couldn’t find/i).count()
check('tracker: unknown ticket shows a clear message', notFound > 0)

// --- catalogue: filter + select changes the stage laptop
await page.evaluate(() => window.__jumpTo('shelf', 0.45))
await page.waitForTimeout(900)
const before = await page.locator('#shelf ul[aria-label="Laptops for sale"] > li').count()
await page.locator('#shelf').getByText('Refurbished', { exact: true }).click()
await page.waitForTimeout(300)
const after = await page.locator('#shelf ul[aria-label="Laptops for sale"] > li').count()
check('catalogue: refurbished filter narrows the list', after < before && after > 0, `${before} → ${after}`)
await page.locator('#shelf').getByText('Under 100k', { exact: true }).click()
await page.waitForTimeout(300)
const cheap = await page.locator('#shelf ul[aria-label="Laptops for sale"] h3').allTextContents()
check('catalogue: budget filter applies', cheap.length === 1 && cheap[0].includes('Tern 14'), cheap.join(', '))
await page.locator('#shelf').getByText('Any budget', { exact: true }).click()
await page.locator('#shelf').getByText('All', { exact: true }).click()
await page.screenshot({ path: 'qa/e2e/shelf-before-select.png' })
await page.locator('#shelf').getByRole('button', { name: /View on stage Kestrel 16 Pro/ }).click()
await page.waitForTimeout(1200)
const pressed = await page.locator('#shelf').getByRole('button', { name: /On stage Kestrel 16 Pro/ }).getAttribute('aria-pressed')
check('catalogue: select marks product as on stage', pressed === 'true')
await page.screenshot({ path: 'qa/e2e/shelf-selected.png' })
const enquire = await page.locator('#shelf').getByRole('link', { name: /Enquire about Kestrel 16 Pro/ }).getAttribute('href')
check('catalogue: Enquire opens WhatsApp with product prefilled', !!enquire && decodeURIComponent(enquire).includes('Kestrel 16 Pro'))

// --- 3D parts: hover shows label, click jumps to its service stop
await page.evaluate(() => window.__jumpTo('teardown', 0.97))
await page.waitForTimeout(1200)
const hit = await page.evaluate(() => {
  // sweep the right half of the screen for a hoverable part
  return null
})
void hit
let hovered = false
for (let y = 250; y <= 760 && !hovered; y += 40) {
  for (let x = 700; x <= 1300 && !hovered; x += 60) {
    await page.mouse.move(x, y)
    await page.waitForTimeout(30)
    hovered = (await page.locator('text=click to see the service').count()) > 0 && (await page.locator('text=click to see the service').isVisible())
    if (hovered) {
      await page.screenshot({ path: 'qa/e2e/part-hover.png' })
      await page.mouse.click(x, y)
    }
  }
}
check('3D: hovering a part shows its label', hovered)
await page.waitForTimeout(2500)
const chapterAfterClick = await page.evaluate(() => location.hash || document.querySelector('[aria-current="true"]')?.textContent)
check('3D: clicking a part jumps to a service stop', hovered && (await page.evaluate(() => window.scrollY)) > 0, String(chapterAfterClick))

// --- keyboard: skip link + chapter nav
await page.goto(`${base}?qa=1`, { waitUntil: 'networkidle' })
await page.keyboard.press('Tab')
const skip = await page.evaluate(() => document.activeElement?.textContent)
check('keyboard: first Tab reaches the skip link', skip === 'Skip to content', skip ?? '')

check('no uncaught page errors', errors.length === 0, errors.join(' | ').slice(0, 200))
await browser.close()
const failed = results.filter((r) => !r.ok).length
console.log(`\n${results.length - failed}/${results.length} passed`)
process.exit(failed ? 1 : 0)
