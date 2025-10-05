module.exports = {
  name: 'timeout',
  description: 'Timeout a member. Usage: !timeout @user <duration in minutes> [reason]',
  async execute(message, args) {
    if (!message.member.permissions.has('ModerateMembers')) {
      return message.reply('❌ You do not have permission to timeout members.');
    }
    if (!message.guild.members.me.permissions.has('ModerateMembers')) {
      return message.reply('❌ I do not have permission to timeout members.');
    }

    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!target) return message.reply('❌ Please mention a member or provide their ID.');

    // duration in minutes
    const durationMinutes = parseInt(args[1], 10);
    if (isNaN(durationMinutes)) return message.reply('❌ Please provide a duration in minutes (e.g. 10).');

    const reason = args.slice(2).join(' ') || 'No reason provided';
    const ms = durationMinutes * 60 * 1000;

    if (!target.moderatable) return message.reply('❌ I cannot timeout that user (higher role or permissions).');

    try {
      await target.timeout(ms, reason);
      message.channel.send(`✅ ${target.user.tag} has been timed out for ${durationMinutes} minute(s). Reason: ${reason}`);
    } catch (err) {
      console.error(err);
      message.reply('❌ Could not timeout that user.');
    }
  },
};
