import { Client, GatewayIntentBits } from 'discord.js'

const client = new Client({ intents: [GatewayIntentBits.Guilds] })
const API = process.env.MILISP_API
const BOT_KEY = process.env.BOT_API_KEY

// ── helpers ──────────────────────────────────────────────────────────────────

async function getDesktopUrl(discordUserId) {
  const res = await fetch(
    `${API}/api/bot/desktop?platform=discord&platformUserId=${discordUserId}`,
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

// ── slash commands ────────────────────────────────────────────────────────────

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return
  if (interaction.commandName !== 'codex') return

  await interaction.deferReply({ ephemeral: true })

  const sub = interaction.options.getSubcommand()
  const userId = interaction.user.id

  if (sub === 'link') {
    const linkUrl = `${API}/link/discord?discord_id=${userId}`
    return interaction.editReply(`Connect your Codexia account:\n${linkUrl}`)
  }

  const url = await getDesktopUrl(userId)
  if (!url) {
    return interaction.editReply('❌ Desktop not connected. Use `/codex link` first.')
  }

  if (sub === 'status') {
    const health = await callDesktop(url, '/health')
    return interaction.editReply(health ? '✅ Desktop online' : '❌ Desktop unreachable')
  }

  if (sub === 'run') {
    const prompt = interaction.options.getString('prompt')
    await callDesktop(url, '/api/codex/turn/start', {
      conversationId: `dc-${userId}`,
      message: prompt,
    })
    return interaction.editReply(`▶ Started: "${prompt}"`)
  }

  if (sub === 'stop') {
    await callDesktop(url, '/api/codex/turn/interrupt', {})
    return interaction.editReply('⏹ Turn interrupted')
  }

  if (sub === 'sessions') {
    const sessions = await callDesktop(url, '/api/cc/list-sessions')
    if (!sessions?.length) return interaction.editReply('No sessions found.')
    const lines = sessions.slice(0, 10).map((s, i) => `${i + 1}. ${s.id}`)
    return interaction.editReply(lines.join('\n'))
  }
})

client.once('ready', () => console.log(`Codexia Discord bot ready: ${client.user.tag}`))
client.login(process.env.DISCORD_BOT_TOKEN)
