const fs = require("fs-extra");

function loadSession(userId) {
  const path = `./sessions/${userId}.json`;
  if (!fs.existsSync(path)) return [{ role: "system", content: "You are a helpful assistant named Jarvis." }];
  return fs.readJSONSync(path);
}

function saveSession(userId, messages) {
  const path = `./sessions/${userId}.json`;
  fs.outputJSONSync(path, messages);
}

module.exports = { loadSession, saveSession };
