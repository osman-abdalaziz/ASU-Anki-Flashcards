// ==========================================
// 🤖 خدمة إشعارات التيليجرام (Telegram Service)
// ==========================================
import { db } from "./config.js";
import {
    collection,
    query,
    where,
    getDocs,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔴 هام جداً: ضع هنا التوكن الذي أعطاه لك BotFather
// const TELEGRAM_BOT_TOKEN = "7963619154:AAETp24BcFTDWJrbuaT1aBFbNHvIbxo42vI";

// ==========================================
// 🎨 خدمة الإشعارات (التصميم الأنيق)
// ==========================================

/**
 * دالة إرسال إشعار للمشتركين (مع صورة وإصدار)
 * @param {string} deckId - معرف الكارت
 * @param {string} deckTitle - العنوان
 * @param {string} updateMessage - تفاصيل التحديث
 * @param {string} version - رقم الإصدار (مثلاً v1.2)
 * @param {string} deckImage - رابط صورة الكارت (اختياري)
 */
export async function notifySubscribers(
    deckId,
    deckTitle,
    updateMessage = "General improvements",
    version = "v1.0",
    deckImage = null // 👈 معامل جديد للصورة
) {
    try {
        console.log(`📣 Notifying subscribers for: ${deckTitle}`);

        const usersRef = collection(db, "users");
        const q = query(
            usersRef,
            where("subscribedDecks", "array-contains", deckId)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) return 0;

        let sentCount = 0;
        const promises = [];

        // 🎨 تصميم الرسالة الأنيق
        const deepLink = `https://asu-anki.netlify.app/?deck=${deckId}`;

        const elegantMessage = `
🚀 *Update Alert!*
━━━━━━━━━━━━━━━━━━
📂 *Deck:* ${deckTitle}
🔖 *Version:* \`${version}\`
━━━━━━━━━━━━━━━━━━

📝 *What's New:*
${updateMessage}

👇 *Tap below to update:*
[📥 Download Now](${deepLink})

`;
        // ملاحظة: جعلنا الرابط يظهر ككلمة Download Now ليكون أنيقاً

        snapshot.forEach((doc) => {
            const userData = doc.data();
            if (userData.telegramId) {
                // نرسل الصورة إذا كانت موجودة، وإلا نرسل صورة افتراضية أو لا شيء
                // يمكنك وضع رابط شعار الموقع هنا كصورة افتراضية
                const imageToSend =
                    deckImage ||
                    "https://i.ibb.co/CsXMbc0t/Orange-White-Modern-Bold-Company-Annual-Report-Presentation-48.png";

                promises.push(
                    sendToTelegram(
                        userData.telegramId,
                        elegantMessage,
                        imageToSend
                    )
                );
                sentCount++;
            }
        });

        await Promise.all(promises);
        return sentCount;
    } catch (error) {
        console.error("❌ Notification Error:", error);
        throw error;
    }
}

// دالة الاتصال بالسيرفر (محدثة لترسل الصورة)
async function sendToTelegram(chatId, text, imageUrl) {
    const url = `https://asu-bot.onrender.com/send-notification`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                telegramId: chatId,
                message: text,
                imageUrl: imageUrl, // 👈 نرسل رابط الصورة للسيرفر
            }),
        });

        if (!response.ok) {
            console.error(`❌ Server refused: ${response.status}`);
            return;
        }
    } catch (e) {
        console.error(`Failed to send to ${chatId}`, e);
    }
}
