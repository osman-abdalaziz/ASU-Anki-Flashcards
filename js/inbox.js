import { db, auth } from "./config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    query,
    where,
    getDocs,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const inboxContainer = document.getElementById("inboxMessagesContainer");
const sidebarBadge = document.getElementById("sidebarInboxBadge");

// 1. التحقق من المستخدم وتحديث الواجهة
onAuthStateChanged(auth, (user) => {
    if (user) {
        // تحديث اسم وصورة المستخدم (اختياري)
        const nameEl = document.getElementById("mobileUserName");
        const avatarEl = document.getElementById("mobileUserAvatar");
        if (nameEl) nameEl.innerText = user.displayName || "Creator";
        if (avatarEl) avatarEl.src = user.photoURL || "../images/user.webp";

        // تحميل رسائل الرفض
        loadInboxMessages(user.uid);
    } else {
        window.location.href = "../index.html";
    }
});

// 2. دالة جلب البيانات ورسم الرسائل
async function loadInboxMessages(userId) {
    try {
        // جلب الكروت الخاصة بهذا الـ Creator وحالتها مرفوضة
        const q = query(
            collection(db, "decks"),
            where("creatorId", "==", userId),
            where("status", "==", "rejected"),
        );

        const querySnapshot = await getDocs(q);
        inboxContainer.innerHTML = "";

        // تحديث البادج في القائمة الجانبية
        if (sidebarBadge) {
            sidebarBadge.innerText = querySnapshot.size;
            sidebarBadge.style.display =
                querySnapshot.size > 0 ? "inline-block" : "none";
        }

        if (querySnapshot.empty) {
            inboxContainer.innerHTML = `
                <div style="text-align: center; color: var(--text-secondary-color); padding: 50px; background: var(--input-bg); border-radius: 8px;">
                    <i class="fa-solid fa-check-circle fa-3x" style="color: #33d9b2; margin-bottom: 15px;"></i>
                    <h3>All Good!</h3>
                    <p>You have no rejected decks or pending actions.</p>
                </div>
            `;
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const id = docSnap.id;

            // استخراج الأسباب والملاحظات
            const reasons = data.rejectionReasons || [];
            let reasonsHTML =
                reasons.length > 0
                    ? `<ul class="reasons-list">${reasons.map((r) => `<li>${r}</li>`).join("")}</ul>`
                    : `<p style="color: var(--text-color);">General revisions required.</p>`;

            const noteHTML = data.rejectionNote
                ? `<div class="admin-note"><strong>Admin Note:</strong> ${data.rejectionNote}</div>`
                : "";

            // تنسيق التاريخ إن وُجد
            let dateStr = "Recently";
            if (data.updatedAt) {
                const dateObj = data.updatedAt.toDate();
                dateStr =
                    dateObj.toLocaleDateString("en-GB") +
                    " " +
                    dateObj.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                    });
            }

            // رسم الكارت الخاص بالرسالة
            const messageCard = document.createElement("div");
            messageCard.className = "inbox-card";
            messageCard.innerHTML = `
                <div class="inbox-header">
                    <h3 class="inbox-title"><i class="fa-solid fa-triangle-exclamation"></i> Action Required: "${data.title}"</h3>
                    <span class="inbox-date">${dateStr}</span>
                </div>
                ${noteHTML}
                <div class="inbox-actions">
                    <a href="submit_deck.html?id=${id}" class="main-btn" style="background-color: #ff5252; border-color: #ff5252; text-decoration: none;">
                        Fix Now <i class="fa-solid fa-arrow-right"></i>
                    </a>
                </div>
            `;

            inboxContainer.appendChild(messageCard);
        });
    } catch (error) {
        console.error("Error loading inbox:", error);
        inboxContainer.innerHTML = `
            <div style="text-align: center; color: #ff5252; padding: 50px;">
                <i class="fa-solid fa-circle-exclamation fa-2x"></i>
                <p style="margin-top: 15px;">Failed to load messages. Please refresh the page.</p>
            </div>
        `;
    }
}
