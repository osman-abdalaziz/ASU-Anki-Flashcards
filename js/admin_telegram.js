import { db, auth } from "./config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    query,
    where,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { initDashboardNotifications } from "./dashboard_notifications.js";
import { showModal, showConfirmModal } from "./ui.js";
const ADMIN_EMAIL = "osmanabdalaziz2005@gmail.com";

// 1. Auth Check
onAuthStateChanged(auth, (user) => {
    if (!user || user.email !== ADMIN_EMAIL) {
        window.location.href = "../index.html";
    }
    initDashboardNotifications(user.uid);
    loadTelegramUsers();
});

const tableBody = document.getElementById("tgUsersTableBody");
const totalCounter = document.getElementById("totalLinkedUsers");
const searchInput = document.getElementById("searchTgInput");

let allUsers = [];
let allDecks = [];

// ==============================
// 2. Load Users
// ==============================
async function loadTelegramUsers() {
    try {
        const snapshot = await getDocs(collection(db, "users"));
        allUsers = [];

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.telegramId) {
                // فقط المرتبطين
                allUsers.push({ id: docSnap.id, ...data });
            }
        });

        totalCounter.innerText = allUsers.length;
        renderTable(allUsers);

        // تحميل الكروت في الخلفية لتكون جاهزة للمودل
        loadDecks();
    } catch (error) {
        console.error(error);
        tableBody.innerHTML = `<tr><td colspan="4" style="color:red; text-align:center;">Error loading users.</td></tr>`;
    }
}

// ==============================
// 3. Render Table (Updated)
// ==============================
function renderTable(users) {
    tableBody.innerHTML = "";
    if (users.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px;">No linked users found.</td></tr>`;
        return;
    }

    users.forEach((user) => {
        // رابط التيليجرام
        const tgLink =
            user.telegramUsername && user.telegramUsername !== "Hidden"
                ? `https://t.me/${user.telegramUsername}`
                : `tg://user?id=${user.telegramId}`;

        // حساب عدد الاشتراكات
        const subsCount = user.subscribedDecks
            ? user.subscribedDecks.length
            : 0;

        const row = `
            <tr>
                <td>
                    <div style="display:flex; flex-direction:column;">
                        <span style="font-weight:600; font-size:0.95rem; color: var(--text-color);">${
                            user.name || "Unknown"
                        }</span>
                        <span style="font-size:0.8rem; color:#888;">${
                            user.email
                        }</span>
                    </div>
                </td>
                <td>
                    <a href="${tgLink}" target="_blank" class="badge-download" style="text-decoration:none;">
                        <i class="fa-brands fa-telegram"></i> ${user.telegramId}
                    </a>
                </td>
                <td>
                    <span class="${
                        subsCount > 0 ? "" : "badge-red"
                    } badge-download">
                        ${subsCount} Decks
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="action-btn edit" onclick="window.openSubsModal('${
                            user.id
                        }')" title="Edit Subscriptions">
                            Edit <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="action-btn delete" onclick="window.unlinkUser('${
                            user.id
                        }', '${user.telegramId}', '${
            user.name
        }')" title="Unlink User">
                            Unlink <i class="fa-solid fa-link-slash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
        tableBody.innerHTML += row;
    });
}

// ==============================
// 4. Search
// ==============================
searchInput.addEventListener("input", (e) => {
    const val = e.target.value.toLowerCase();
    const filtered = allUsers.filter(
        (u) =>
            (u.name && u.name.toLowerCase().includes(val)) ||
            (u.email && u.email.toLowerCase().includes(val)) ||
            String(u.telegramId).includes(val)
    );
    renderTable(filtered);
});

// ==============================
// 5. Load Decks & Edit Modal (Fixes Applied)
// ==============================
async function loadDecks() {
    const snap = await getDocs(collection(db, "decks"));
    allDecks = [];
    snap.forEach((d) => {
        const data = d.data();

        // 🛑 تجاهل المحذوف (Deleted)
        if (data.isDeleted === true) return;

        allDecks.push({
            id: d.id,
            title: data.title,
            category: data.category || "General", // عملي أو نظري أو غيره
            year: data.year || "",
        });
    });
}

window.openSubsModal = (userId) => {
    const user = allUsers.find((u) => u.id === userId);
    if (!user) return;

    const modal = document.getElementById("subsModal");
    const container = document.getElementById("decksCheckboxList");
    const title = document.getElementById("subsModalUser");
    const saveBtn = document.getElementById("saveSubsBtn");
    const cancelBtn = document.getElementById("cancelSubsBtn");

    title.innerText = `Managing: ${user.name}`;
    container.innerHTML = "";

    const userSubs = user.subscribedDecks || [];

    // ترتيب الكروت أبجدياً لتسهيل البحث
    allDecks.sort((a, b) => a.title.localeCompare(b.title));

    allDecks.forEach((deck) => {
        const isChecked = userSubs.includes(deck.id) ? "checked" : "";

        const div = document.createElement("div");
        div.style.cssText =
            "margin-bottom: 8px; border-bottom: 1px solid var(--ver-tag-color); padding-bottom: 5px;";

        // 🎨 إصلاح التنسيق: لون أسود للنص + إضافة التصنيف (Category)
        div.innerHTML = `
            <label style="
                display:flex; 
                align-items:center; 
                cursor:pointer; 
                font-size:0.95rem; 
                color: var(--text-color); /* ✅ لون داكن للقراءة */
                width: 100%;
            ">
                <input type="checkbox" value="${
                    deck.id
                }" ${isChecked} style="margin-right:10px; width:16px; height:16px; accent-color: var(--main-color);">
                
                <div style="display:flex; flex-direction:column;">
                    <span style="font-weight:500;">${deck.title}</span>
                    <span style="font-size: 0.75rem; color: var(--text-secondary-color);">
                        ${deck.year ? deck.year + " - " : ""} 
                        <span style="color: var(--main-color); font-weight:600;">${
                            deck.category
                        }</span>
                    </span>
                </div>
            </label>
        `;
        container.appendChild(div);
    });

    modal.classList.add("active");

    // Save Action
    // Save Action (داخل دالة openSubsModal)
    saveBtn.onclick = async () => {
        saveBtn.innerText = "Saving...";
        // جلب الاشتراكات المختارة
        const selected = Array.from(
            container.querySelectorAll("input:checked")
        ).map((cb) => cb.value);

        try {
            // 1. تحديث قاعدة البيانات
            await updateDoc(doc(db, "users", userId), {
                subscribedDecks: selected,
            });

            // 2. إرسال الإشعار للطالب (الجزء الجديد) 🔔
            const notifUrl = `https://asu-bot.onrender.com/send-notification`;

            await fetch(notifUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    telegramId: user.telegramId,
                    // رسالة واضحة ومنسقة
                    message: `👮‍♂️ **Subscription Update**\n\nThe admin has modified your deck subscriptions.\n\n📚 **Current Active Decks:** ${selected.length}\n\n_You can check the changes in /mydecks_`,
                }),
            });

            showModal(
                "Success",
                "Subscriptions updated and notification sent!",
                "success"
            );
            modal.classList.remove("active");
            loadTelegramUsers(); // تحديث الجدول
        } catch (error) {
            console.error("Update Error:", error);
            showModal(
                "Error",
                "Failed to update subscriptions.",
                "error"
            );
        } finally {
            saveBtn.innerText = "Save Changes";
        }
    };

    cancelBtn.onclick = () => modal.classList.remove("active");
};

// ==============================
// 6. Unlink User
// ==============================
window.unlinkUser = (userId, tgId, userName) => {
    showConfirmModal(
        "Unlink User?",
        `Are you sure you want to disconnect ${userName}? They will stop receiving notifications.`,
        async () => {
            try {
                // 1. نرسل الإشعار (بدون صورة هذه المرة لضمان الوصول)
                const url = `https://asu-bot.onrender.com/send-notification`;
                await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        telegramId: tgId,
                        message: `⚠️ **Account Disconnected**\n\nThe admin has unlinked your Telegram account from the website.`,
                    }),
                });

                // 2. الحذف من قاعدة البيانات
                await updateDoc(doc(db, "users", userId), {
                    telegramId: null,
                    telegramUsername: null,
                });

                showModal(
                    "Unlinked",
                    "User disconnected successfully.",
                    "success"
                );
                loadTelegramUsers();
            } catch (error) {
                console.error(error);
                showModal("Error", "Failed to unlink.", "error");
            }
        },
        "Yes, Unlink",
        "warning"
    );
};

// ==============================
// 7. Helpers (Modals & Notif)
// ==============================
function showCustomModal(title, message, type = "success") {
    const overlay = document.getElementById("customModal");
    const box = overlay.querySelector(".modal-box");
    const titleEl = document.getElementById("modalTitle");
    const msgEl = document.getElementById("modalMessage");
    const iconEl = document.getElementById("modalIconClass");
    const okBtn = document.getElementById("modalOkBtn");
    const cancelBtn = document.getElementById("modalCancelBtn");

    titleEl.textContent = title;
    msgEl.textContent = message;
    cancelBtn.style.display = "none";

    if (type === "error") {
        box.classList.add("error");
        iconEl.className = "fa-solid fa-xmark";
        iconEl.style.color = "#ff5252";
    } else {
        box.classList.remove("error");
        iconEl.className = "fa-solid fa-check";
        iconEl.style.color = "var(--main-color)";
    }

    overlay.classList.add("active");
    okBtn.onclick = () => overlay.classList.remove("active");
}

// function showConfirmModal(title, message, onConfirm) {
//     const overlay = document.getElementById("customModal");
//     const titleEl = document.getElementById("modalTitle");
//     const msgEl = document.getElementById("modalMessage");
//     const iconEl = document.getElementById("modalIconClass");
//     const okBtn = document.getElementById("modalOkBtn");
//     const cancelBtn = document.getElementById("modalCancelBtn");

//     titleEl.textContent = title;
//     msgEl.textContent = message;
//     iconEl.className = "fa-solid fa-triangle-exclamation";
//     iconEl.style.color = "#ff9800";

//     cancelBtn.style.display = "inline-block";
//     okBtn.textContent = "Yes, Do it";

//     overlay.classList.add("active");

//     okBtn.onclick = () => {
//         onConfirm();
//         overlay.classList.remove("active");
//     };

//     cancelBtn.onclick = () => overlay.classList.remove("active");
// }

async function sendBotNotification(chatId, message) {
    const url = `https://asu-bot.onrender.com/send-notification`;
    try {
        await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                telegramId: chatId,
                message: message,
                imageUrl: "https://i.ibb.co/kgNrJm8/preview.webp",
            }),
        });
    } catch (e) {
        console.error("Bot Notification Failed:", e);
    }
}
