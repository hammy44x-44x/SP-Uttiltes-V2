const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const warnsFile = path.join(dataDir, 'warnings.json');

function ensureData() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(warnsFile)) fs.writeFileSync(warnsFile, JSON.stringify({}), 'utf8');
}

function readWarns() {
  ensureData();
  const raw = fs.readFileSync(warnsFile, 'utf8');
  return JSON.parse(raw || '{}');
}

function writeWarns(obj) {
  fs.writeFileSync(warnsFile, JSON.stringify(obj, null, 2), 'utf8');
}

module.exports = {
  name: 'warn',
  description: 'Warn a user and store the warning. Usage: !warn @user [reason] | !warn check @user | !warn remove @user index',
  async execute(message, args) {
    if (!message.member.permissions.has('KickMembers')) {
      return message.reply('❌ You do not have permission to warn members.');
    }

    const sub = args[0];
    // Check warnings: !warn check @user
    if (sub === 'check') {
      const user = message.mentions.users.first() || (args[1] ? await message.client.users.fetch(args[1]).catch(()=>null) : null);
      if (!user) return message.reply('❌ Please mention a user to check.');
      const warns = readWarns();
      const userWarns = warns[user.id] || [];
      if (userWarns.length === 0) return message.reply(`✅ ${user.tag} has no warnings.`);
      const list = userWarns.map((w, i) => `${i + 1}. ${w.reason} — by ${w.authorTag} on ${w.date}`).join('\n');
      return message.reply(`⚠️ Warnings for ${user.tag}:\n${list}`);
    }

    // Remove warning: !warn remove @user index
    if (sub === 'remove') {
      const user = message.mentions.users.first() || (args[1] ? await message.client.users.fetch(args[1]).catch(()=>null) : null);
      const index = parseInt(args[2], 10) - 1;
      if (!user || isNaN(index)) return message.reply('❌ Usage: !warn remove @user index');
      const warns = readWarns();
      const userWarns = warns[user.id] || [];
      if (!userWarns[index]) return message.reply('❌ That warning does not exist.');
      const removed = userWarns.splice(index, 1);
      warns[user.id] = userWarns;
      writeWarns(warns);
      return message.reply(`✅ Removed warning: "${removed[0].reason}" for ${user.tag}`);
    }

    // Add warning: !warn @user reason...
    const user = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0]).catch(()=>null) : null);
    if (!user) return message.reply('❌ Please mention a user to warn.');

    const reason = args.slice(1).join(' ') || 'No reason provided';

    const warns = readWarns();
    if (!warns[user.id]) warns[user.id] = [];
    warns[user.id].push({
      reason,
      authorId: message.author.id,
      authorTag: message.author.tag,
      date: new Date().toISOString(),
    });
    writeWarns(warns);

    message.channel.send(`⚠️ ${user.tag} has been warned. Reason: ${reason}`);
    try {
      await user.send(`You have been warned in **${message.guild.name}**. Reason: ${reason}`);
    } catch (err) {
      // ignore DM errors
    }
  },
};
