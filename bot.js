const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const path = require('path');
const fs = require('fs');
const Fuse = require('fuse.js');
require("dotenv").config();

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates] });

const prefix = '!';
const jewswrld = './music'; // audio files

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === 'play') {
    if (args.length === 0) {
      return message.reply('Please provide a song name.');
    }
    const songName = args.join(' ');

    const songFiles = fs.readdirSync(jewswrld).filter(file => file.endsWith('.mp3'));
    const fuse = new Fuse(songFiles, {
      includeScore: true,
      keys: ['']
    });

    const result = fuse.search(songName);

    if (result.length === 0) {
      return message.reply(`No song found matching "${songName}".`);
    }

    const bestMatch = result[0].item;
    const songPath = path.join(jewswrld, bestMatch);

    if (message.member.voice.channel) {
      const connection = await joinVoiceChannel({
        channelId: message.member.voice.channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      const player = createAudioPlayer();
      const resource = createAudioResource(songPath);

      const subscription = connection.subscribe(player);

      player.on(AudioPlayerStatus.Idle, () => {
        subscription.unsubscribe();
        connection.destroy();
      });

      player.on('error', error => {
        console.error(`Error: ${error.message}`);
        
      });

      player.play(resource);
      await message.reply(`Now playing: ${bestMatch}`);
    } else {
      message.reply('join vc');
    }
  }
});

client.login(process.env.token);