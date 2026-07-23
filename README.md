# Chatly

Telegram uslubidagi real-vaqt messenger. React + Node.js/Express + Socket.IO + MongoDB.

## Funksiyalar
- Shaxsiy va guruh chatlari, umumiy suhbat, saqlangan xabarlar
- Matn, rasm, fayl, ovozli xabar; javob berish, tahrirlash, o'chirish (hammaga/faqat menda), forward
- Reaksiyalar, pin, @mention, matn formatlash (**qalin**, *kursiv*, `kod`), havola preview
- Onlayn holat, "yozmoqda...", ko'rildi belgisi, guruhda kim ko'rganini ko'rish
- Guruh adminlari (chiqarish/tayinlash), taklif havolasi
- Arxivlash, ovozsiz qilish, chatni tepaga mahkamlash, foydalanuvchini bloklash
- Xabarni rejalashtirish, chat foni, qorong'i/yorug' rejim
- **Ovozli va videoli qo'ng'iroq** (WebRTC, 1-on-1)

## Ishga tushirish

### Talablar
- Node.js 18+
- MongoDB (lokal yoki Atlas)

### Backend
```bash
cd backend
npm install
cp .env.example .env   # va .env faylini o'zingizga moslang
npm run dev            # yoki: node server.js
```
Server `http://localhost:5000` da ishga tushadi.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Sayt `http://localhost:5173` da ochiladi.

## Eslatma: qo'ng'iroq funksiyasi
Ovozli/videoli qo'ng'iroq WebRTC orqali ishlaydi (faqat STUN, TURN server yo'q):
- Bir xil Wi-Fi/tarmoqda va aksariyat uy routerlarida muammosiz ishlaydi.
- Juda qattiq korporativ/mobil NAT orqasida ba'zan ulanmasligi mumkin — bu TURN server bo'lmagani uchun, WebRTC'ning umumiy cheklovi.
- Brauzer kamera/mikrofonga ruxsat so'raydi — `localhost`da HTTPS shart emas, lekin boshqa domenga chiqarsangiz HTTPS kerak bo'ladi.

## Papka tuzilishi
```
Chatly/
├── backend/     Express API + Socket.IO server
└── frontend/    React (Vite) ilova
```
