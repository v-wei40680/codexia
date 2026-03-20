import TelegramBot from 'node-telegram-bot-api'

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true })
const API = process.env.MILISP_API
const BOT_KEY = process.env.BOT_API_KEY

// ── helpers ──────────────────────────────────────────────────────────────────

async function getDesktopUrl(chatId) {
  const res = await fetch(
    `${API}/api/bot/desktop?platform=telegram&platformUserId=${chatId}`,
    { headers: { 'x-bot-api-key': BOT_KEY } }
  )
  if (!res.ok) return null
  const { url } = await res.json()
  return url
}

async function callDesktop(url, path, body = null) {
  const opts = {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${url}${path}`, opts)
  return res.ok ? res.json() : null
}

async function requireDesktop(chatId) {
  const url = await getDesktopUrl(chatId)
  if (!url) {
    bot.sendMessage(chatId, '❌ Desktop not connected. Use /link first.')
  }
  return url
}

// ── commands ─────────────────────────────────────────────────────────────────

bot.onText(/\/start$/, (msg) => {
  bot.sendMessage(msg.chat.id,
    'Codexia Bot\n\n' +
    '/link — connect this chat to your Codexia account\n' +
    '/run <prompt> — start an agent turn\n' +
    '/stop — interrupt current turn\n' +
    '/status — check desktop connection\n' +
    '/sessions — list CC sessions'
  )
})

bot.onText(/\/link/, (msg) => {
  const chatId = msg.chat.id
  const linkUrl = `${API}/link/telegram?chat_id=${chatId}`
  bot.sendMessage(chatId,
    `Open this link to connect your Codexia account:\n${linkUrl}`
  )
})

bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id
  const url = await getDesktopUrl(chatId)
  if (!url) return
  const health = await callDesktop(url, '/health')
  bot.sendMessage(chatId, health ? '✅ Desktop online' : '❌ Desktop unreachable')
})

bot.onText(/\/run (.+)/, async (msg, match) => {
  const chatId = msg.chat.id
  const prompt = match[1]
  const url = await requireDesktop(chatId)
  if (!url) return

  bot.sendMessage(chatId, `▶ Starting turn: "${prompt}"`)
  const result = await callDesktop(url, '/api/codex/turn/start', {
    conversationId: `tg-${chatId}`,
    message: prompt,
  })
  if (!result) bot.sendMessage(chatId, '❌ Failed to start turn')
})

bot.onText(/\/stop/, async (msg) => {
  const chatId = msg.chat.id
  const url = await requireDesktop(chatId)
  if (!url) return
  await callDesktop(url, '/api/codex/turn/interrupt', {})
  bot.sendMessage(chatId, '⏹ Turn interrupted')
})

bot.onText(/\/sessions/, async (msg) => {
  const chatId = msg.chat.id
  const url = await requireDesktop(chatId)
  if (!url) return
  const sessions = await callDesktop(url, '/api/cc/list-sessions')
  if (!sessions?.length) return bot.sendMessage(chatId, 'No sessions found.')
  const lines = sessions.slice(0, 10).map((s, i) => `${i + 1}. ${s.id}`)
  bot.sendMessage(chatId, lines.join('\n'))
})

console.log('Codexia Telegram bot running...')
