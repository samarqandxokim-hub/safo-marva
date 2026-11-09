# SafaFlow — Telegram e’lonlar boshqaruvi

SafaFlow Telegram kanallari va guruhlariga bir xil e’lonni belgilangan jadval bo‘yicha yuboradi. Dashboard’da kanal tanlash, matn tayyorlash, kunlik takrorlar sonini (masalan, 5, 10 yoki 15 marta) belgilash, jadvalni to‘xtatish va yuborish tarixini ko‘rish mumkin. Bot buyruqlari: `/start`, `/kanal`, `/qaysi`, `/vaqt`, `/tashamoqchi` va `/help`.

> **Muhim:** Telegram Bot API sizning shaxsiy profilingiz nomidan post qila olmaydi. Botni kanalga administrator qilib qo‘shib, post yuborish huquqini bering. Guruhda botga xabar yuborish ruxsati bo‘lishi kerak.

## 1. Bot va serverni sozlash

1. Telegram’dagi [@BotFather](https://t.me/BotFather) ga `/newbot` yuboring va bot tokenini oling.
2. Loyihani HTTPS manzilli hostingga joylashtiring. Hostingning **Environment Variables** bo‘limida quyidagilarni belgilang:

| O‘zgaruvchi | Izoh |
| --- | --- |
| `DATABASE_URL` | PostgreSQL ulanish manzili |
| `TELEGRAM_BOT_TOKEN` | BotFather bergan maxfiy token — **GitHub’ga yozmang** |
| `APP_URL` | Saytning to‘liq HTTPS manzili, masalan `https://safaflow.example.com` |
| `BOT_OWNER_ID` | Botga `/start` yuborganda ko‘rsatiladigan egasining Telegram ID raqami |
| `DASHBOARD_PASSWORD` | Web panel uchun kuchli admin paroli |
| `CRON_SECRET` | Kamida 32 belgili tasodifiy maxfiy kalit |
| `TELEGRAM_WEBHOOK_SECRET` | Ixtiyoriy. Belgilanmasa, token asosida serverda hosil qilinadi |

`CRON_SECRET` yaratish uchun terminalda `openssl rand -hex 32` buyrug‘idan foydalaning. Token va parollarni GitHub repository’ga fayl sifatida qo‘shmang; hostingning environment/secret sozlamalarida saqlang.

3. `TELEGRAM_BOT_TOKEN` ni qo‘shib, dashboard’ni oching va **Sozlamalar → Webhook ulash** tugmasini bosing.
4. Telegram’da botga `/start` yuboring. `BOT_OWNER_ID` hali sozlanmagan bo‘lsa, bot shaxsiy xabarda Telegram ID raqamingizni ko‘rsatadi. Shu ID’ni hosting’da `BOT_OWNER_ID` sifatida saqlab, ilovani qayta ishga tushiring va `/start` ni yana yuboring.
5. Botni har bir kanalga administrator qilib qo‘shing. Dashboard’da **Kanallar → Kanal qo‘shish** orqali `@username` yoki `-100…` bilan boshlanuvchi chat ID’ni kiriting. Ochiq kanal uchun `https://t.me/username` havolasi ham qabul qilinadi.

## 2. GitHub Actions’ga ulash

Loyihada `.github/workflows/telegram-publish.yml` workflow mavjud. U har 5 daqiqada jadvalni tekshiradi va belgilangan vaqt kelgan bo‘lsa, e’lonni kanallarga yuboradi. Workflow faylini GitHub repository’ga push qiling, keyin:

1. GitHub repository → **Settings → Secrets and variables → Actions** bo‘limiga o‘ting.
2. `APP_URL` secret’ga saytning HTTPS manzilini kiriting.
3. `CRON_SECRET` secret’ga hosting’dagi `CRON_SECRET` bilan bir xil qiymatni kiriting.
4. GitHub → **Actions** bo‘limidan workflow holatini ko‘ring. `workflow_dispatch` orqali qo‘lda ham ishga tushirish mumkin.

GitHub schedule odatda 5 daqiqalik intervalda ishlaydi, shu sabab e’lon belgilangan daqiqadan **5 daqiqagacha kechikishi** mumkin. CRON endpoint `Authorization: Bearer …` orqali himoyalangan.

## 3. E’lonni rejalashtirish

Dashboard’da **Yangi e’lon** tugmasini bosing, matnni tekshiring, 6–7 ta kanal/guruhni belgilang va boshlanish/tugash vaqtini hamda kunlik takrorlar sonini tanlang. E’lon oynasida Safa Marva Umra safari uchun namunaviy matn tayyor turadi; uni o‘zgartirib, boshqa e’lonni ham kiritish mumkin.

Misol: `12:00`–`24:00`, kuniga `10 marta`, `Asia/Tashkent` vaqti. E’lonlar shu oraliqda taxminan teng taqsimlanadi; har bir reja vaqtida matn barcha tanlangan kanallarga bir martadan yuboriladi. Telegram 4 096 belgidan uzun matnni qabul qilmaydi. Yuborish natijalari **Jo‘natmalar tarixi** sahifasida saqlanadi.

Bot orqali: `/kanal @kanal_username` — kanal qo‘shish, `/kanal` — kanallarni tanlash, `/qaysi` — jadval kiritish, `/vaqt 12:00 24:00 10` — jadvalni tez sozlash, `/tashamoqchi` — e’lon matnini yuborish. Matn oldindan ko‘rsatiladi; bot uni faqat **Tasdiqlash** tugmasi bosilgandan keyin jadvalga qo‘shadi.

## 4. Lokal ishga tushirish

```bash
cp .env.example .env
# .env ichiga DATABASE_URL va kerakli development qiymatlarini kiriting
npm install
npx drizzle-kit push
npm run dev
```

Telegram webhook uchun lokal server internetdan ko‘rinadigan HTTPS URL’da bo‘lishi kerak. Oddiy `localhost` manzili Telegram’dan callback qabul qilmaydi.

## Ma’lumot xavfsizligi

Ommaviy deployment’da `DASHBOARD_PASSWORD` ni albatta belgilang. `TELEGRAM_BOT_TOKEN`, `CRON_SECRET` va webhook secret’ni brauzerga yoki GitHub repository ichidagi kodga chiqarmang. Bot buyruqlari `BOT_OWNER_ID` bilan cheklanadi; panel API’lari esa admin sessiyasini talab qiladi.

## Shaxsiy Telegram akkaunti orqali yuborish (sinov varianti)

Bu ixtiyoriy rejim; odatiy bot ishlashini o'zgartirmaydi. Shaxsiy akkaunt rejimida dastur faqat akkaunt a'zo bo'lgan guruhlarni tanlaydi, ularga avtomatik qo'shilmaydi. Faqat ruxsat berilgan guruhlarga yuboring. Telegram akkauntini cheklashi mumkin. Foydalanishdan oldin kichik sinov guruhida tekshiring.

1. Node.js 20 yoki undan yangi versiyani shaxsiy kompyuteringizga o'rnating. Shu loyiha papkasida `npm install` va `node scripts/telegram-login.cjs` ishga tushiring. Telefon raqami, API ID/HASH, Telegram yuborgan kirish kodi va agar so'ralsa 2FA parolini faqat o'z kompyuteringizdagi terminalga kiriting. Dasturni boshqa birov ko'rayotgan terminalda ishlatmang.
2. Ekranda chiqqan sessiya qatori akkauntingizga kirishga teng maxfiy ma'lumotdir. Uni hech kimga yubormang, GitHubga, logga yoki e'lon matniga joylamang. Faqat Render servisining Environment bo'limiga `TELEGRAM_USER_SESSION` sifatida kiriting. Render'da `TELEGRAM_API_ID`, `TELEGRAM_API_HASH` ham bo'lsin. Agar biror kishi sessiyani ko'rsa, Telegram Settings > Devices orqali sessiyani bekor qiling.
3. Render servisida `TELEGRAM_SENDER=account` qilib saqlang va redeploy qiling. Shundan keyin xabarlar bot emas, shaxsiy akkauntdan yuboriladi. Bot rejimiga qaytish uchun `TELEGRAM_SENDER` ni o'chiring. Kodlar va sessiya Render loglariga yoki GitHub Actionsga yozilmasligi kerak.
4. Panelda kanal turini emas, guruhni tanlang; akkauntingiz a'zo bo'lgan guruhning @username yoki -100... chat ID sini kiriting. Shaxsiy invite linklar qabul qilinmaydi. Bot rejimida qo'shilgan kanallar akkaunt rejimida guruh bo'lmasa xatoga uchraydi.
5. Jadval ishlashi uchun GitHub repository'dagi Actions workflow'ni yoqing va Render'dagi qiymatlar bilan bir xil `APP_URL` hamda `CRON_SECRET` ni GitHub Actions Secrets'ga qo'shing. Secretlar kodda saqlanmasin. GitHub schedule kechikishi yoki ishga tushmasligi mumkin; Render bepul servisi uxlaganda ham ishga tushish kechikadi.

Qurish va TypeScript tekshirildi; haqiqiy Telegram akkaunti va real yuborish bilan sinov o'tkazilmagan. Ehtiyot bo'lib avval sinov guruhida bitta xabar yuboring. Agar 2FA, flood limit yoki session xatosi chiqsa, cheklovlarni chetlab o'tmang.
