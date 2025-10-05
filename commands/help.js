module.exports = {
    name: 'help',
    description: 'Lists all available commands',
    execute(message, args) {
        const commandNames = message.client.commands.map(cmd => cmd.name).join(', ');
        message.channel.send(`Available commands: ${commandNames}`);
    }
};
