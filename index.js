const { makeWASocket, useSingleFileAuthState, downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { chatWithGPT, transcribeAudio } = require("./openai");
const { loadSession, saveSession } = require("./utils");
const commands = require("./commands");
const config = require("./config");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");

const { state, saveState } = useSingleFileAuthState("./auth_info.json");

async function connectBot() {
  const sock = makeWASocket({ auth: state, printQRInTerminal: true });
  sock.ev.on("creds.update", saveState);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const id = from.split("@")[0];
    const message = msg.message;

    const type = Object.keys(message)[0];
    const body = message.conversation || message.extendedTextMessage?.text || "";

    if (type === "audioMessage") {
      const audioPath = `./voices/${id}.ogg`;
      const outPath = `./voices/${id}.wav`;
      const stream = await downloadContentFromMessage(message.audioMessage, "audio");
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
      fs.writeFileSync(audioPath, buffer);

      await new Promise((resolve, reject) =>
        ffmpeg(audioPath).toFormat("wav").save(outPath).on("end", resolve).on("error", reject)
      );

      const transcribed = await transcribeAudio(outPath);
      const history = loadSession(id);
      history.push({ role: "user", content: transcribed });
      const reply = await chatWithGPT(history);
      history.push({ role: "assistant", content: reply });
      saveSession(id, history);

      return sock.sendMessage(from, { text: `🗣️ ${transcribed}\n\n🤖 ${reply}` });
    }

    if (body.startsWith(".")) {
      const [cmd, ...args] = body.split(" ");
      const input = args.join(" ");
      if (cmd === ".help") {
        return sock.sendMessage(from, { text: commands.help() });
      } else if (cmd === ".reset") {
        saveSession(id, []);
        return sock.sendMessage(from, { text: "✅ Jarvis has reset your chat history." });
      } else if (cmd === ".ai") {
        const history = loadSession(id);
        history.push({ role: "user", content: input });
        const reply = await chatWithGPT(history);
        history.push({ role: "assistant", content: reply });
        saveSession(id, history);
        return sock.sendMessage(from, { text: reply });
      } else {
        return sock.sendMessage(from, { text: "❓ Unknown command. Type .help" });
      }
    }

    const history = loadSession(id);
    history.push({ role: "user", content: body });
    const reply = await chatWithGPT(history);
    history.push({ role: "assistant", content: reply });
    saveSession(id, history);

    return sock.sendMessage(from, { text: reply });
  });
}

connectBot();
