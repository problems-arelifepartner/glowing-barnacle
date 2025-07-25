require("dotenv").config();

module.exports = {
  openaiApiKey: process.env.OPENAI_API_KEY,
  model: "gpt-3.5-turbo",
};
