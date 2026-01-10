import { db, auth } from "./config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    getDocs,
    doc,
    deleteDoc,
    query,
    orderBy,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { initDashboardNotifications } from "./dashboard_notifications.js";
// 1. حماية الصفحة
const ADMIN_EMAIL = "osmanabdalaziz2005@gmail.com";
onAuthStateChanged(auth, (user) => {
    if (!user || user.email !== ADMIN_EMAIL) {
        window.location.href = "../index.html";
    } else {
        const avatar = document.getElementById("mobileUserAvatar");
        if (avatar) avatar.src = user.photoURL || "../images/user.png";
        initDashboardNotifications(user.uid);
    }
});

const tableBody = document.getElementById("reportsTableBody");

// 2. دالة تحميل البلاغات
async function loadReports() {
    tableBody.innerHTML =
        '<tr><td colspan="6" style="text-align:center;">Loading reports...</td></tr>';

    try {
        // جلب البلاغات مرتبة بالأحدث
        const q = query(
            collection(db, "reports"),
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);

        tableBody.innerHTML = "";

        if (querySnapshot.empty) {
            tableBody.innerHTML =
                '<tr><td colspan="6" style="text-align:center; padding: 20px;">No issues reported! 🎉</td></tr>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();

            // تنسيق التاريخ
            let dateStr = "N/A";
            if (data.createdAt && data.createdAt.seconds) {
                const dateObj = new Date(data.createdAt.seconds * 1000);
                dateStr = dateObj.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                });
            }

            // تحديد لون السبب (Reason Color)
            let reasonColor = "#ff6b6b"; // أحمر (Broken Link)
            if (data.reason === "Outdated Content") reasonColor = "#feca57"; // أصفر
            if (data.reason === "Other") reasonColor = "#54a0ff"; // أزرق

            const row = `
                <tr> 
                    <td style="font-weight:500; color: var(--main-color);">
                        ${data.deckTitle || "Unknown Deck"}
                        <br><span style="font-size:10px; color:#777;">ID: ${
                            data.deckId
                        }</span>
                    </td>
                    <td>
                        <span style="background:${reasonColor}; color:#fff; padding:3px 8px; border-radius:4px; font-size:12px;">
                            ${data.reason}
                        </span>
                    </td>
                    <td style="max-width: 300px; font-size: 0.9rem;">
                        ${
                            data.details ||
                            "<em style='color:#777'>No details provided</em>"
                        }
                    </td>
                    <td>
                        ${data.reporterEmail || "Anonymous"}
                    </td>
                    <td>${dateStr}</td>
                    <td>
                        <button class="action-btn unhide-btn" onclick="window.resolveReport('${
                            docSnap.id
                        }')" title="Mark as Resolved (Delete)">
                            Resolve <i class="fa-solid fa-check"></i>
                        </button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    } catch (error) {
        console.error("Error loading reports:", error);
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Error: ${error.message}</td></tr>`;
    }
}

// 3. حذف البلاغ (حل المشكلة)
window.resolveReport = async (reportId) => {
    const isConfirmed = await window.showConfirm(
        "Resolve Report?",
        "Did you fix the issue? This will remove the report permanently.",
        "warning"
    );

    if (!isConfirmed) return;

    try {
        await deleteDoc(doc(db, "reports", reportId));
        showModal("Resolved!", "Report has been removed.", "success");
        loadReports(); // إعادة تحميل
    } catch (error) {
        console.error(error);
        showModal("Error", error.message, "error");
    }
};

// 4. البحث في الجدول
const searchInput = document.getElementById("searchReportsInput");
if (searchInput) {
    searchInput.addEventListener("keyup", () => {
        const val = searchInput.value.toLowerCase();
        const rows = document.querySelectorAll("#reportsTableBody tr");
        rows.forEach((row) => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(val) ? "" : "none";
        });
    });
}

// تشغيل عند التحميل
document.addEventListener("DOMContentLoaded", loadReports);

// دالة المودل
function showModal(title, message, type = "success") {
    const overlay = document.getElementById("customModal");
    const box = overlay.querySelector(".modal-box");
    const titleEl = document.getElementById("modalTitle");
    const msgEl = document.getElementById("modalMessage");
    const iconEl = document.getElementById("modalIconClass");
    const btn = document.getElementById("modalOkBtn");

    titleEl.textContent = title;
    msgEl.textContent = message;

    box.className = "modal-box";
    if (type === "success") {
        box.classList.add("success");
        iconEl.className = "fa-solid fa-check";
    } else {
        box.classList.add("error");
        iconEl.className = "fa-solid fa-xmark";
    }
    overlay.classList.add("active");
    btn.onclick = () => overlay.classList.remove("active");
}

// 🔥🔥🔥 الدالة السحرية الجديدة (Confirm Modal) 🔥🔥🔥
window.showConfirm = (title, message, type = "warning") => {
    return new Promise((resolve) => {
        const overlay = document.getElementById("customModal");
        const titleEl = document.getElementById("modalTitle");
        const msgEl = document.getElementById("modalMessage");
        const iconEl = document.getElementById("modalIconClass");
        const okBtn = document.getElementById("modalOkBtn");
        const cancelBtn = document.getElementById("modalCancelBtn");
        const box = overlay.querySelector(".modal-box");

        // تعبئة النصوص
        titleEl.textContent = title;
        msgEl.textContent = message;

        // إظهار زر الإلغاء
        cancelBtn.style.display = "inline-block";
        okBtn.textContent = "Confirm"; // تغيير النص لتأكيد

        // تنسيق الأيقونة والألوان
        box.className = "modal-box";
        if (type === "warning") {
            // للحذف
            box.classList.add("error"); // أحمر
            iconEl.className = "fa-solid fa-triangle-exclamation";
            okBtn.style.backgroundColor = "#ff5252";
        } else {
            box.classList.add("info");
            iconEl.className = "fa-solid fa-circle-question";
            okBtn.style.backgroundColor = "var(--main-color)";
        }

        // إظهار المودل
        overlay.classList.add("active");

        // التعامل مع الضغطات (مرة واحدة فقط لتجنب التكرار)
        const handleOk = () => {
            cleanup();
            resolve(true); // ✅ المستخدم وافق
        };

        const handleCancel = () => {
            cleanup();
            resolve(false); // ❌ المستخدم ألغى
        };

        // تنظيف المستمعين عند الإغلاق
        function cleanup() {
            okBtn.removeEventListener("click", handleOk);
            cancelBtn.removeEventListener("click", handleCancel);
            overlay.classList.remove("active");
        }

        okBtn.addEventListener("click", handleOk);
        cancelBtn.addEventListener("click", handleCancel);
    });
};

// دالة showModal العادية (للتنبيهات فقط بدون Cancel)
window.showModal = (title, message, type = "success") => {
    const overlay = document.getElementById("customModal");
    const box = overlay.querySelector(".modal-box");
    const titleEl = document.getElementById("modalTitle");
    const msgEl = document.getElementById("modalMessage");
    const iconEl = document.getElementById("modalIconClass");
    const okBtn = document.getElementById("modalOkBtn");
    const cancelBtn = document.getElementById("modalCancelBtn");

    titleEl.textContent = title;
    msgEl.textContent = message;

    // إخفاء زر الإلغاء في وضع التنبيه العادي
    cancelBtn.style.display = "none";
    okBtn.textContent = "OK";
    okBtn.style.backgroundColor =
        type === "error" ? "#ff5252" : "var(--main-color)";

    box.className = "modal-box";
    if (type === "success") {
        box.classList.add("success");
        iconEl.className = "fa-solid fa-check";
    } else {
        box.classList.add("error");
        iconEl.className = "fa-solid fa-xmark";
    }

    overlay.classList.add("active");

    // عند الضغط يغلق فقط
    okBtn.onclick = () => overlay.classList.remove("active");
};
