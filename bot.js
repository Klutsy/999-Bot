const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const path = require('path');
const fs = require('fs');
const Fuse = require('fuse.js');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
require("dotenv").config();

ffmpeg.setFfmpegPath(ffmpegPath);

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

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

        // Assuming the last argument might be the bass level
        let bassLevel = 0;  // Default bass level
        const bassLevelArg = args[args.length - 1];

        if (!isNaN(bassLevelArg) && parseInt(bassLevelArg) >= 0 && parseInt(bassLevelArg) <= 100) {
            bassLevel = parseInt(bassLevelArg);
            args.pop();  // Remove the bass level from args
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
      const connection = joinVoiceChannel({
        channelId: message.member.voice.channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

    const player = createAudioPlayer();

    // Use ffmpeg to apply bass boost
    const resource = createAudioResource(await applyBassBoost(songPath, bassLevel));

    player.play(resource); 
    connection.subscribe(player);

      player.on(AudioPlayerStatus.Idle, () => {
        connection.destroy();
      });

      player.on('error', error => {
        console.error(`Error: ${error.message}`);
        
      });

      await message.reply(`Now playing: ${bestMatch}`);
    } else {
      message.reply('join vc');
    }
  }
});

function applyBassBoost(filePath, bassLevel) {
    const adjustedBassLevel = bassLevel / 10; // scale the bass level to a range for ffmpeg
    return new Promise((resolve, reject) => {
        const outputPath = path.join(MUSIC_FOLDER, `temp_${path.basename(filePath)}`);
        ffmpeg(filePath)
            .audioFilters(`bass=g=${adjustedBassLevel}`)
            .save(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', (err) => reject(err));
    });
}

client.login(process.env.token);
