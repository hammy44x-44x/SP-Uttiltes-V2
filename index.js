const fs = require('fs');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const config = require('./config.json');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Command handler
client.commands = new Collection();
if (!fs.existsSync('./commands')) fs.mkdirSync('./commands');
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command && command.name) client.commands.set(command.name, command);
}

// Anti-spam & cooldown
const cooldowns = new Map();

// Anti-caps helper
function hasTooManyCaps(message) {
    const text = message.content.replace(/[^A-Za-z]/g, '');
    if (!text) return false;
    const caps = text.split('').filter(c => c === c.toUpperCase()).length;
    const percent = (caps / text.length) * 100;
    return percent >= config.capsThreshold;
}

client.on('messageCreate', message => {
    if (message.author.bot) return;

    // Anti-caps
    if (hasTooManyCaps(message)) {
        message.delete().catch(() => {});
        message.channel.send(`${message.author}, please avoid using too many caps!`).catch(() => {});
        return;
    }

    // Spam cooldown
    const now = Date.now();
    if (cooldowns.has(message.author.id)) {
        const expirationTime = cooldowns.get(message.author.id) + config.spamCooldown;
        if (now < expirationTime) return;
    }
    cooldowns.set(message.author.id, now);

    // Prefix check
    if (!message.content.startsWith(config.prefix)) return;

    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) return;

    try {
        command.execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply('There was an error executing that command!').catch(() => {});
    }
});

client.once('ready', () => {
    console.log(`${client.user.tag} is online!`);
});

client.login(config.token);