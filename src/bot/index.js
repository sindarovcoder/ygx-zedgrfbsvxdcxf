require("dotenv").config();
const bot = require("./core/events")

bot.on("polling_error", () => console.error("Polling error:", "Token noto'g'ri yoki internetga ulanishda muammo bor!"));

console.log("🤖 Bot ishga tushdi...");

module.exports = bot;
