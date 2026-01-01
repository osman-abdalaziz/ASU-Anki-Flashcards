import { db, auth } from "./config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    getDocs,
    doc,
    deleteDoc,
    updateDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const ADMIN_EMAIL = "osmanabdalaziz2005@gmail.com";
onAuthStateChanged(auth, (user) => {
    if (!user || user.email !== ADMIN_EMAIL) {
        window.location.href = "../index";
    }
});

const tableBody = document.getElementById("decksTableBody");

// ... (دالة loadDecks كما هي بدون تغيير) ...
// تأكد من وضع دالة loadDecks هنا (أو اتركها كما هي في ملفك)

async function loadDecks() {
    // ... (نفس كود التحميل السابق) ...
    // اختصاراً للمساحة، افترض أن الكود هنا هو نفسه الموجود عندك
    // المهم هو ما سيأتي في الأسفل
    tableBody.innerHTML =
        '<tr><td colspan="6" style="text-align:center;">Loading...</td></tr>';
    try {
        const querySnapshot = await getDocs(collection(db, "decks"));
        tableBody.innerHTML = "";
        if (querySnapshot.empty) {
            tableBody.innerHTML =
                '<tr><td colspan="6" style="text-align:center;">No Decks found yet.</td></tr>';
            return;
        }
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const yearVal = data.year ? data.year.toLowerCase() : "";
            const catVal = data.category ? data.category.toLowerCase() : "";
            const isHidden = data.isHidden === true;
            const hideBtnClass = isHidden ? "unhide-btn" : "hide-btn";
            const hideBtnText = isHidden ? "Unhide" : "Hide";
            const hideBtnIcon = isHidden ? "fa-eye" : "fa-eye-slash";

            const row = `
                <tr data-year="${yearVal}" data-category="${catVal}"> 
                    <td>${data.title}</td>
                    <td>${data.module}</td>
                    <td>${data.year}</td>
                    <td>${data.lastUpdate}</td>
                    <td>${data.version}</td>
                    <td>
                        <button class="action-btn edit" onclick="window.openEditModal('${docSnap.id}', '${data.title}', '${data.downloadUrl}', '${data.imageUrl}', '${data.version}')">
                            Edit <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="action-btn ${hideBtnClass}" onclick="window.toggleDeckVisibility('${docSnap.id}', ${isHidden})">
                            ${hideBtnText} <i class="fa-solid ${hideBtnIcon}"></i>
                        </button>
                        <button class="action-btn delete" onclick="window.deleteDeck('${docSnap.id}')">
                            Delete <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    } catch (error) {
        console.error("Error:", error);
    }
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

// 2. تعديل دالة الحذف لاستخدام showConfirm
window.deleteDeck = async (id) => {
    // 👇 انظر كيف نستخدم await هنا بدلاً من if(confirm(...))
    const isConfirmed = await window.showConfirm(
        "Delete Deck?",
        "Are you sure you want to delete this deck permanently? This action cannot be undone.",
        "warning"
    );

    if (isConfirmed) {
        try {
            await deleteDoc(doc(db, "decks", id));
            window.showModal(
                "Deleted!",
                "The Deck Is Deleted Successfully",
                "success"
            );
            loadDecks();
        } catch (error) {
            window.showModal("Error", error.message, "error");
        }
    }
};

// تعديل دالة الإخفاء أيضاً
window.toggleDeckVisibility = async (id, currentStatus) => {
    /* يمكنك تفعيل التأكيد هنا أيضاً لو أردت، أو تركها مباشرة */
    // مثال:
    // if (!await window.showConfirm("Change Visibility?", "Are you sure?")) return;

    const newStatus = !currentStatus;
    const actionText = newStatus ? "Hidden" : "Visible";

    try {
        const deckRef = doc(db, "decks", id);
        await updateDoc(deckRef, { isHidden: newStatus });
        window.showModal(
            "Status Updated!",
            `The deck is now ${actionText}.`,
            "success"
        );
        loadDecks();
    } catch (error) {
        console.error("Error:", error);
        window.showModal("Error", "Failed to update status.", "error");
    }
};

// ... (باقي الدوال مثل openEditModal, closeEditModal, الفلترة, والـ Listener تبقى كما هي) ...
// تأكد من نسخ باقي الكود الموجود في ملفك الأصلي هنا (مثل window.openEditModal وتشغيل loadDecks في النهاية)

// --- تكملة الكود (نسخ لصق من ملفك الأصلي) ---
window.openEditModal = (id, title, url, img, version) => {
    document.getElementById("editDeckId").value = id;
    document.getElementById("editTitle").value = title;
    document.getElementById("editUrl").value = url;
    document.getElementById("editimgUrl").value = img;
    document.getElementById("editVersion").value = version;
    document.getElementById("editDeckModal").classList.add("active");
};
window.closeEditModal = () => {
    document.getElementById("editDeckModal").classList.remove("active");
};
const editForm = document.getElementById("editDeckForm");
if (editForm) {
    editForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = document.getElementById("editDeckId").value;
        try {
            const deckRef = doc(db, "decks", id);
            await updateDoc(deckRef, {
                title: document.getElementById("editTitle").value,
                downloadUrl: document.getElementById("editUrl").value,
                imageUrl: document.getElementById("editimgUrl").value,
                version: document.getElementById("editVersion").value,
            });
            window.showModal(
                "Updated!",
                "Deck updated successfully",
                "success"
            );
            closeEditModal();
            loadDecks();
        } catch (error) {
            window.showModal("Error", error.message, "error");
        }
    });
}
// الفلترة
const searchInput = document.getElementById("searchDecksInput");
const yearSelect = document.getElementById("filterYear");
const catSelect = document.getElementById("filterCategory");
function filterDecks() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedYear = yearSelect.value.toLowerCase();
    const selectedCat = catSelect.value.toLowerCase();
    const rows = document.querySelectorAll("#decksTableBody tr");
    rows.forEach((row) => {
        const text = row.textContent.toLowerCase();
        const matchesSearch = text.includes(searchTerm);
        const rowYear = row.getAttribute("data-year");
        const matchesYear = selectedYear === "all" || rowYear === selectedYear;
        const rowCat = row.getAttribute("data-category");
        const matchesCat = selectedCat === "all" || rowCat === selectedCat;
        row.style.display =
            matchesSearch && matchesYear && matchesCat ? "" : "none";
    });
}
if (searchInput) searchInput.addEventListener("keyup", filterDecks);
if (yearSelect) yearSelect.addEventListener("change", filterDecks);
if (catSelect) catSelect.addEventListener("change", filterDecks);

document.addEventListener("DOMContentLoaded", loadDecks);
