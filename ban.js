module.exports = {
  name: 'ban',
  description: 'Ban a member. Usage: !ban @user [reason]',
  async execute(message, args) {
    if (!message.member.permissions.has('BanMembers')) {
      return message.reply('❌ You do not have permission to ban members.');
    }
    if (!message.guild.members.me.permissions.has('BanMembers')) {
      return message.reply('❌ I do not have permission to ban members.');
    }

    const user = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    if (!user) return message.reply('❌ Please mention a user or provide their ID.');

    const reason = args.slice(1).join(' ') || 'No reason provided';

    try {
      await user.ban({ days: 1, reason }); // days=1 removes 1 day of messages; change as needed
      message.channel.send(`✅ ${user.user.tag} was banned. Reason: ${reason}`);
    } catch (err) {
      console.error(err);
      message.reply('❌ Something went wrong while trying to ban that user.');
    }
  },
};
