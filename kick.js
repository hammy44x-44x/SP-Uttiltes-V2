module.exports = {
  name: 'kick',
  description: 'Kick a member. Usage: !kick @user [reason]',
  async execute(message, args) {
    if (!message.member.permissions.has('KickMembers')) {
      return message.reply('❌ You do not have permission to kick members.');
    }
    if (!message.guild.members.me.permissions.has('KickMembers')) {
      return message.reply('❌ I do not have permission to kick members.');
    }

    const user = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!user) return message.reply('❌ Please mention a user or provide their ID.');

    if (!user.kickable) return message.reply('❌ I cannot kick that user (they may have higher role).');

    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      await user.kick(reason);
      message.channel.send(`✅ ${user.user.tag} was kicked. Reason: ${reason}`);
    } catch (err) {
      console.error(err);
      message.reply('❌ Something went wrong while trying to kick that user.');
    }
  },
};
