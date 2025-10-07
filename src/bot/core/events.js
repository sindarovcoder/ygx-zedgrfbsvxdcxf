const bot = require("./bot");
const express = require("express");
const { inlineKeyboard, securityMessageHtml } = require("../../common/index");



const app = express();
app.use(express.json());

const TOKEN = process.env.TOKEN;

bot.setWebHook(`${process.env.RENDER_EXTERNAL_URL}/webhook/${TOKEN}`);

app.post(`/webhook/${TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// Endpoint to get server time (ret time)
app.get('/ret-time', (req, res) => {
    res.json({ time: new Date().toISOString() });
});

bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const opts = {
        reply_markup: {
            keyboard: [
                [
                    {
                        text: '📲 Telefon raqamni yuborish',
                        request_contact: true, // muhim: Telegram telefonni yuborish imkonini beradi
                    },
                ],
            ],
            one_time_keyboard: true,
            resize_keyboard: true,
        },
    };

    bot.sendMessage(
        chatId,
        `Assalomu alaykum! Iltimos, telefon raqamingizni yuboring (telefon tugmasi orqali).`,
        opts
    );
});

bot.on("inline_query", async (query) => {

    const text = query.query;

    if (text !== 'Salomlar05') return;

    try {
        const queryId = query.id;

        // har bir natija unique bo'lishi kerak
        const result = [
            {
                type: 'article',
                id: 'cyber_security_alert_1', // har doim noyob bo'lsin
                title: 'Kiritilgan: Telegram akkaunt buzilganida tezkor ko‘rsatma',
                input_message_content: {
                    message_text: securityMessageHtml,
                    parse_mode: 'Markdown',
                },
                description: "Telegram akkauntingiz buzilganida yuboriladigan xabar va tavsiyalar",
                reply_markup: inlineKeyboard
            }
        ];

        // Bot API ga javob yuboramiz
        // cache_time: natijani qancha vaqt cache qilishi (soniyalar). 0 bo'lsa doimo yangilanadi.
        await bot.answerInlineQuery(queryId, result, { cache_time: 30 });
    } catch (err) {
        console.error('inline_query handling error:', err);
    }
});

const pendingVerifications = new Map();

async function sendSms(phoneNumber, code) {
    // --- Demo: konsolga chiqaramiz (ishlab chiqishda haqiqiy SMS yuboring) ---
    console.log(`Sending SMS to ${phoneNumber}: Your verification code is ${code}`);

    // Agar Twilio ishlatmoqchi bo'lsangiz:
    /*
    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    return twilio.messages.create({
      body: `Your verification code: ${code}`,
      from: process.env.TWILIO_PHONE,
      to: phoneNumber
    });
    */
}

bot.on('message', async (msg) => {
    // Agar bu message contact tipida bo'lsa — telefon keladi
    if (msg.contact && msg.contact.phone_number) {
        const chatId = msg.chat.id;
        const phone = normalizePhone(msg.contact.phone_number);

        // Yangilash: agar allaqachon mavjud verification bo'lsa, yangilang
        const code = makeCode();
        const expiresAt = minutesFromNow(5); // kod 5 daqiqa amal qiladi

        pendingVerifications.set(chatId, { phone, code, expiresAt });

        try {
            await sendSms(phone, code); // haqiqiy SMS yuborishni shu yerda chaqiring
            await bot.sendMessage(chatId, `Telefon raqamga SMS orqali 4-xonali kod yubordik. Iltimos kelgan kodni shu yerga kiriting:`);
        } catch (err) {
            console.error('SMS yuborishda xato:', err);
            await bot.sendMessage(chatId, `SMS yuborishda xatolik yuz berdi. Iltimos keyinroq qayta urinib ko'ring.`);
        }
        return; // contact bilan ishlash tugadi
    }

    // Agar user matn yuborgan bo'lsa — u kodni kiritayotgan bo'lishi mumkin
    if (msg.text) {
        const chatId = msg.chat.id;
        const pending = pendingVerifications.get(chatId);
        if (!pending) {
            // foydalanuvchi kod kiritmayapti — boshqa matnlar uchun kerakli javob
            return;
        }

        const userText = msg.text.trim();
        // faqat 4 xonali raqam qabul qilayapmiz (siz o'zgartirishingiz mumkin)
        if (!/^\d{4}$/.test(userText)) {
            await bot.sendMessage(chatId, `Iltimos 4 xonali kodni to'g'ri kiriting (faqat raqamlar).`);
            return;
        }

        // tekshirish va muddati
        const now = Date.now();
        if (now > pending.expiresAt) {
            pendingVerifications.delete(chatId);
            await bot.sendMessage(chatId, `Kodni yuborilgan muddat tugadi. Iltimos, qayta telefonni yuboring yoki /start ni bosing.`);
            return;
        }

        if (userText === pending.code) {
            // muvaffaqiyatli tasdiqlash
            pendingVerifications.delete(chatId);

            // Bu yerda siz userni DBda belgilashingiz, token berishingiz yoki sessiya yaratishingiz mumkin.
            await bot.sendMessage(chatId, `✅ Raqam tasdiqlandi! Siz muvaffaqiyatli autentifikatsiyadan o'tdingiz.`);
            // masalan: saveVerifiedUser(chatId, pending.phone)
        } else {
            await bot.sendMessage(chatId, `❌ Noto'g'ri kod. Iltimos, SMS dagi 4-xonali kodni kiriting.`);
        }

        return;
    }
});

function makeCode() {
    return Math.floor(1000 + Math.random() * 9000).toString(); // 1000-9999
}
function minutesFromNow(mins) {
    return Date.now() + mins * 60 * 1000;
}

function normalizePhone(phone) {
    // oddiy tozalash: bo'shliq, tire va boshqalarni olib tashlash
    // va agar mahalliy format bo'lsa +998 kabi qo'shish kerak bo'lsa uni shu yerda qiling
    return phone.replace(/\s+/g, '').replace(/-/g, '');
}

const PORT = 10001;
app.listen(PORT, () => {
    console.log(`Bot server running on port ${PORT}`);
});

module.exports = bot;
