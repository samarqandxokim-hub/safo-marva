// Run privately on your own computer, never in a shared terminal or CI log.
const { TelegramClient } = require('teleproto');
const { StringSession } = require('teleproto/sessions');
const readline = require('node:readline/promises');

(async () => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  let client;
  try {
    console.log('Hech kimga kod, API hash yoki sessiyani bermang. Ushbu terminalni boshqalarga ko‘rsatmang.');
    const id = Number(await rl.question('Telegram API ID: '));
    const hash = (await rl.question('Telegram API HASH: ')).trim();
    if (!Number.isSafeInteger(id) || id <= 0 || !hash) throw new Error('API ID yoki API HASH noto‘g‘ri.');
    client = new TelegramClient(new StringSession(''), id, hash, { connectionRetries: 2 });
    await client.start({
      phoneNumber: () => rl.question('Telefon raqam (+998...): '),
      phoneCode: () => rl.question('Telegram bergan kod: '),
      password: () => rl.question('Telegram ikki bosqichli paroli (agar so‘ralsa): '),
      emailAddress: () => rl.question('Telegram so‘ragan email: '),
      emailVerification: async () => ({ type: 'code', code: await rl.question('Email kodi: ') }),
      onError: (e) => console.error('Kirish xatosi:', e.message),
    });
    console.log('\nQuyidagi sessiya MAXFIY. Uni faqat Render Environment ichidagi TELEGRAM_USER_SESSION qiymatiga qo‘ying:');
    console.log(client.session.save());
    console.log('Sessiyani hech kimga yubormang, GitHubga qo‘ymang.');
  } catch (error) { console.error('Ish bajarilmadi:', error.message); process.exitCode = 1; }
  finally { if (client) await client.disconnect(); rl.close(); }
})();
