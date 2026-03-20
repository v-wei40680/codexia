import { REST, Routes } from 'discord.js'

const commands = [
  {
    name: 'codex',
    description: 'Codexia agent commands',
    options: [
      {
        name: 'run',
        description: 'Start an agent turn',
        type: 1, // SUB_COMMAND
        options: [{ name: 'prompt', description: 'Prompt', type: 3, required: true }],
      },
      { name: 'stop', description: 'Interrupt current turn', type: 1 },
      { name: 'status', description: 'Check desktop connection', type: 1 },
      { name: 'sessions', description: 'List CC sessions', type: 1 },
      { name: 'link', description: 'Link your Discord account to Codexia', type: 1 },
    ],
  },
]

const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN)
await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands })
console.log('Slash commands registered.')
