const jokes = [
  "Why don't scientists trust atoms? Because they make up everything!",
  "I told my computer I needed a break, and it said 'No problem — I'll go to sleep.'",
  "Why did the scarecrow win an award? Because he was outstanding in his field!",
];

module.exports = {
  name: 'joke',
  description: 'Tells a random joke. Usage: !joke',
  async execute(message) {
    const joke = jokes[Math.floor(Math.random() * jokes.length)];
    await message.channel.send(joke);
  },
};
