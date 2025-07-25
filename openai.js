const { Configuration, OpenAIApi } = require("openai");
const fs = require("fs");
const config = require("./config");

const openai = new OpenAIApi(new Configuration({ apiKey: config.openaiApiKey }));

async function chatWithGPT(messages) {
  const res = await openai.createChatCompletion({
    model: config.model,
    messages,
  });
  return res.data.choices[0].message.content.trim();
}

async function transcribeAudio(filePath) {
  const res = await openai.createTranscription(
    fs.createReadStream(filePath),
    "whisper-1"
  );
  return res.data.text;
}

module.exports = { chatWithGPT, transcribeAudio };
