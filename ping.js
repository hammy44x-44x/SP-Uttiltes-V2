module.exports = {
    name: 'ping',                // command name
    description: 'Replies with Pong!',  // description
    execute(message, args) {     // function that runs when command is used
        message.channel.send('Pong!');
    }
};
