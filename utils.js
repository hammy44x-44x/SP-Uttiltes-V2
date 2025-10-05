// utils/antiAbuse.js
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// In-memory maps
const userMessages = new Map(); // guildId:userId => [timestamps]
const recentWarns = new Map(); // guildId:userId => last warn timestamp

function ensureData() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({}, null, 2), 'utf8');
  }
}

function loadSettings() {
  ensureData();
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf8') || '{}';
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load settings.json', err);
    return {};
  }
}

function saveSettings(obj) {
  ensureData();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(obj, null, 2), 'utf8');
}

function getGuildSettings(guildId) {
  const all = loadSettings();
  if (!all[guildId]) {
    all[guildId] = {
      antispam: { enabled: false, thresholdCount: 5, thresholdSeconds: 7, timeoutMinutes: 1 },
      anticaps: { enabled: false, percent: 0.7, minLength: 8 },
    };
    saveSettings(all);
  }
  return all[guildId];
}

function updateGuildSettings(guildId, newSettings) {
  const all = loadSettings();
  all[guildId] = Object.assign(getGuildSettings(guildId), newSettings);
  saveSettings(all);
}

// helper: percent uppercase
function capsRatio(text) {
  const letters = text.replace(/[^A-Za-z]/g, '');
  if (!letters.length) return 0;
  const upper = letters.replace(/[^A-Z]/g, '').length;
  return upper / letters.length;
}

// Clean up old message timestamps in map
function pruneOld(timestamps, windowMs) {
  const cutoff = Date.now() - windowMs;
  while (timestamps.length && timestamps[0] < cutoff) timestamps.shift();
}

// Main handler: returns true if message was handled (deleted/timed out) so caller can stop command processing
async function handleAntiAbuse(message) {
  // only handle guild text messages from real users
  if (!message.guild || message.author.bot) return false;

  const guildId = message.guild.id;
  const userId = message.author.id;
  const settings = getGuildSettings(guildId);

  // --- Anti-caps ---
  if (settings.anticaps && settings.anticaps.enabled) {
    try {
      const text = message.content || '';
      if (text.length >= (settings.anticaps.minLength || 8)) {
        const ratio = capsRatio(text);
        if (ratio >= (settings.anticaps.percent || 0.7)) {
          // Delete message and warn
          await message.delete().catch(() => {});
          // rate limit warns to avoid spam: only once per 10s
          const key = `${guildId}:${userId}`;
          const last = recentWarns.get(key) || 0;
          if (Date.now() - last > 10_000) {
            recentWarns.set(key, Date.now());
            await message.channel.send(`${message.author}, please avoid excessive caps. Your message was removed.`).catch(() => {});
          }
          return true;
        }
      }
    } catch (err) {
      console.error('anticaps error', err);
    }
  }

  // --- Anti-spam ---
  if (settings.antispam && settings.antispam.enabled) {
    try {
      const key = `${guildId}:${userId}`;
      const now = Date.now();
      const windowMs = (settings.antispam.thresholdSeconds || 7) * 1000;
      const limit = settings.antispam.thresholdCount || 5;

      if (!userMessages.has(key)) userMessages.set(key, []);
      const timestamps = userMessages.get(key);
      timestamps.push(now);
      // prune old
      pruneOld(timestamps, windowMs);

      if (timestamps.length > limit) {
        // rate limit action: don't spam punish same user repeatedly
        const last = recentWarns.get(key) || 0;
        if (Date.now() - last < 10_000) {
          // already acted recently
          return true;
        }
        recentWarns.set(key, Date.now());

        // attempt to timeout user (if bot has permission)
        const member = message.guild.members.cache.get(userId) || await message.guild.members.fetch(userId).catch(()=>null);
        const timeoutMinutes = settings.antispam.timeoutMinutes || 1;
        if (member && member.moderatable) {
          await member.timeout(timeoutMinutes * 60 * 1000, 'Automatic anti-spam').catch(async (err) => {
            console.error('Failed to timeout user', err);
            // fallback: try deleting recent messages from this user
            await message.channel.send(`${message.author}, please stop spamming. (could not apply timeout)`).catch(()=>{});
          });
          await message.channel.send(`${message.author} has been timed out for spamming (${timeoutMinutes} minute(s)).`).catch(()=>{});
        } else {
          // fallback: delete the message and warn
          await message.delete().catch(()=>{});
          await message.channel.send(`${message.author}, please stop spamming.`).catch(()=>{});
        }

        // clear their timestamps to avoid repeated triggers
        userMessages.set(key, []);
        return true;
      }
    } catch (err) {
      console.error('antispam error', err);
    }
  }

  return false;
}

module.exports = {
  handleAntiAbuse,
  getGuildSettings,
  updateGuildSettings,
};
