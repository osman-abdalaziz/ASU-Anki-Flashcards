import { db, auth } from "./config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    getDocs,
    doc,
    deleteDoc,
    updateDoc,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { initDashboardNotifications } from "./dashboard_notifications.js";
const ADMIN_EMAIL = "osmanabdalaziz2005@gmail.com";
onAuthStateChanged(auth, (user) => {
    if (!user || user.email !== ADMIN_EMAIL) {
        window.location.href = "../index";
    }
    initDashboardNotifications(user.uid);
});
import { notifySubscribers } from "./telegram_service.js";
import { showConfirmModal, showModal } from "./ui.js"; // تأكد من وجود ui.js

const tableBody = document.getElementById("decksTableBody");
let currentTab = "approved";
// ... (دالة loadDecks كما هي بدون تغيير) ...
// تأكد من وضع دالة loadDecks هنا (أو اتركها كما هي في ملفك)

// ✅ دالة جديدة: تحسب الإصدار التالي تلقائياً
function incrementVersion(oldVersion) {
    if (!oldVersion) return "v1.0";
    const match = oldVersion.match(/(\d+)\.(\d+)/);
    if (match) {
        let major = parseInt(match[1]);
        let minor = parseInt(match[2]);
        minor++;
        if (minor > 9) {
            minor = 0;
            major++;
        }
        return `v${major}.${minor}`;
    }
    return oldVersion;
}

window.allDecksData = []; // أضف هذا السطر قبل الدالة لتخزين كل الكروت

async function loadDecks() {
    tableBody.innerHTML =
        '<tr><td colspan="6" style="text-align:center;">Loading...</td></tr>';
    let pendingCount = 0; // لحساب عدد الملفات المعلقة
    window.allDecksData = []; // قم بتفريغ المصفوفة مع كل تحميل جديد لتجنب التكرار

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

            // حفظ بيانات الديك بالكامل مع الـ ID لاستخدامها في المعاينة
            window.allDecksData.push({ id: docSnap.id, ...data });

            // 🔥 فلترة: تجاهل الملفات المحذوفة
            if (data.isDeleted === true) return;

            // تحديد حالة الملف (إذا لم يكن له حالة، فهو قديم ومعتمد)
            const status = data.status || "approved";

            if (status === "pending") pendingCount++;

            // لا ترسم الصف إذا لم يكن يطابق التبويب الحالي
            if (status !== currentTab) return;

            const yearVal = data.year ? data.year.toLowerCase() : "";
            const catVal = data.category ? data.category.toLowerCase() : "";
            const isHidden = data.isHidden === true;
            const hideBtnClass = isHidden ? "unhide-btn" : "hide-btn";
            const hideBtnText = isHidden ? "Unhide" : "Hide";
            const hideBtnIcon = isHidden ? "fa-eye" : "fa-eye-slash";

            let actionButtons = "";

            if (currentTab === "approved") {
                // أزرار لوحة المعتمد (القديمة)
                actionButtons = `
                    <button class="action-btn edit" onclick="window.openEditModal('${docSnap.id}', '${data.title}', '${data.downloadUrl}', '${data.imageUrl}', '${data.version}')">
                        Edit <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="action-btn ${hideBtnClass}" onclick="window.toggleDeckVisibility('${docSnap.id}', ${isHidden})">
                        ${hideBtnText} <i class="fa-solid ${hideBtnIcon}"></i>
                    </button>
                    <button class="action-btn delete" onclick="window.deleteDeck('${docSnap.id}')">
                        Delete <i class="fa-solid fa-trash"></i>
                    </button>
                `;
            } else {
                // أزرار لوحة المراجعة (بتنسيق CSS الجديد)
                // <a
                //     href="${data.downloadUrl}"
                //     target="_blank"
                //     class="action-btn review"
                //     style="text-decoration: none; display: inline-block;">
                //     Review <i class="fa-solid fa-up-right-from-square"></i>
                // </a>;
                actionButtons = `
                    <button class="action-btn review" onclick="openAdminReview('${docSnap.id}')">
                        Review Details <i class="fa-solid fa-eye"></i>
                    </button>
                    <button class="action-btn approve" onclick="window.approveDeck('${docSnap.id}', '${data.title}')">
                        Approve <i class="fa-solid fa-check"></i>
                    </button>
                    <button class="action-btn reject" onclick="window.openRejectionModal('${docSnap.id}')">
                        Reject <i class="fa-solid fa-xmark"></i>
                    </button>
                `;
            }

            const row = `
                <tr data-year="${yearVal}" data-category="${catVal}"> 
                    <td><span class="badge-download"><i class="fa-solid fa-folder-closed fa-fw"></i> ${data.title}</span></td>
                    <td>${data.module || "N/A"}</td>
                    <td>${data.year || "N/A"}</td>
                    <td>${data.lastUpdate || "New"}</td>
                    <td><span style="font-size:0.85rem; background: #ffffff11; color:#888; padding: 4px 10px; border-radius: 6px;">${data.version || "v1.0"}</span></td>
                    <td>${actionButtons}</td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });

        // تحديث الرقم الأحمر للملفات المعلقة
        const pendingBadge = document.getElementById("pendingBadge");
        if (pendingBadge) {
            pendingBadge.innerText = pendingCount;
            pendingBadge.style.display = pendingCount > 0 ? "flex" : "none";
        }

        if (tableBody.innerHTML === "") {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 30px; color:#777;">No ${currentTab} decks found.</td></tr>`;
        }
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

// // دالة showModal العادية (للتنبيهات فقط بدون Cancel)
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
    const isConfirmed = await window.showConfirm(
        "Delete Deck?",
        "Are you sure you want to delete this deck? Users will lose access to it immediately.",
        "warning",
    );

    if (isConfirmed) {
        try {
            // ❌ القديم: كان يحذف الملف نهائياً فلا يراه السيرفر
            // await deleteDoc(doc(db, "decks", id));

            // ✅ الجديد (Soft Delete): نضع علامة ونحدث التاريخ ليراه الطلاب
            await updateDoc(doc(db, "decks", id), {
                isDeleted: true,
                updatedAt: serverTimestamp(), // هذا الجرس اللي هيصحي جهاز الطالب
            });

            window.showModal(
                "Deleted!",
                "The Deck has been removed successfully.",
                "success",
            );
            loadDecks(); // إعادة تحميل الجدول لإخفاء الكارت
        } catch (error) {
            window.showModal("Error", error.message, "error");
        }
    }
};

// تعديل دالة الإخفاء أيضاً
window.toggleDeckVisibility = async (id, currentStatus) => {
    // تأكيد اختياري (يمكنك تفعيله لو أردت)
    // if (!await window.showConfirm("Change Visibility?", "Are you sure?")) return;

    const newStatus = !currentStatus;
    const actionText = newStatus ? "Hidden" : "Visible";

    try {
        const deckRef = doc(db, "decks", id);

        // 🔥 التعديل هنا: نحدث التاريخ أيضاً ليراه الطلاب 🔥
        await updateDoc(deckRef, {
            isHidden: newStatus,
            updatedAt: serverTimestamp(),
        });

        window.showModal(
            "Status Updated!",
            `The deck is now ${actionText}.`,
            "success",
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
                updatedAt: serverTimestamp(), // 🔥🔥🔥 هذا هو السطر السحري الجديد
            });
            window.showModal(
                "Updated!",
                "Deck updated successfully",
                "success",
            );
            closeEditModal();

            showConfirmModal(
                "Notify Students? 📢",
                "Do you want to send a Telegram notification to all students who subscribed to this deck?",
                async () => {
                    const title = document.getElementById("editTitle").value;
                    const newVersion =
                        document.getElementById("editVersion").value; // الإصدار الجديد
                    const standardMessage =
                        "✨ New Cards, content improvements, and fixes applied."; // الرسالة الموحدة

                    const unifiedImage =
                        "https://i.ibb.co/CsXMbc0t/Orange-White-Modern-Bold-Company-Annual-Report-Presentation-48.png"; // صورة موحدة للإشعار
                    // إظهار رسالة "جارِ الإرسال"
                    showModal(
                        "Sending...",
                        "Please wait while we notify users...",
                        "info",
                    );

                    try {
                        const count = await notifySubscribers(
                            id,
                            title,
                            standardMessage,
                            newVersion,
                            unifiedImage,
                        );

                        // رسالة النهاية
                        if (count > 0) {
                            showModal(
                                "Success",
                                `Notification sent to ${count} students successfully!`,
                                "success",
                            );
                        } else {
                            showModal(
                                "Done",
                                "No linked subscribers found for this deck.",
                                "warning",
                            );
                        }
                    } catch (e) {
                        showModal(
                            "Error",
                            "Failed to send notifications.",
                            "error",
                        );
                    }
                },
                "Yes, Notify", // نص زر الموافقة
                "info",
            );

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

// التبديل بين التبويبات
window.switchTab = function (tabName) {
    currentTab = tabName;

    // تغيير الشكل الخارجي للزر
    document.getElementById("tabApproved").classList.remove("active");
    document.getElementById("tabPending").classList.remove("active");

    if (tabName === "approved")
        document.getElementById("tabApproved").classList.add("active");
    if (tabName === "pending")
        document.getElementById("tabPending").classList.add("active");

    // إعادة تحميل الجدول
    loadDecks();
};

// الموافقة على الملف المعلق
window.approveDeck = async function (id, title) {
    const isConfirmed = await window.showConfirm(
        "Approve Deck?",
        `Are you sure you want to approve "${title}"? It will go live immediately.`,
        "success",
    );
    if (!isConfirmed) return;

    try {
        await updateDoc(doc(db, "decks", id), {
            status: "approved",
            lastUpdate: new Date().toLocaleDateString("en-GB"),
            updatedAt: serverTimestamp(), // 🔥 السطر السحري اللي هيحل المشكلة جذرياً
        });
        showModal("Success", "Deck has been approved and is now live!");
        loadDecks(); // تحديث الجدول

        // إرسال إشعار للطلاب بوجود ملف جديد (اختياري)
        // notifySubscribers(id, title, "A new deck is available for download!", "v1.0");
    } catch (error) {
        console.error("Approval Error:", error);
        showModal("Error", "Failed to approve the deck.");
    }
};

document.addEventListener("DOMContentLoaded", loadDecks);

const adminReviewModal = document.getElementById("adminReviewModal");
let currentPendingDeckId = null;

// دالة فتح نافذة المراجعة
window.openAdminReview = function (deckId) {
    // البحث في المصفوفة التي قمنا بتعبئتها
    const deck = window.allDecksData.find((d) => d.id === deckId);
    if (!deck) return;

    currentPendingDeckId = deckId;

    // تعبئة البيانات المرئية للأدمن
    document.getElementById("reviewImage").src =
        deck.imageUrl || "../images/default_banner.webp";
    document.getElementById("reviewTitle").textContent = deck.title;
    document.getElementById("reviewYear").innerHTML =
        `<i class="fa-solid fa-calendar-days"></i> ${deck.year || "N/A"}`;
    document.getElementById("reviewCategory").innerHTML =
        `<i class="fa-solid fa-tag"></i> ${deck.category || "N/A"}`;
    document.getElementById("reviewCreator").innerHTML =
        `<i class="fa-solid fa-user"></i> ${deck.creator || "Unknown"}`;
    document.getElementById("downloadReviewBtn").href = deck.downloadUrl;

    const rawDescription = deck.description || "*No description provided.*";
    document.getElementById("reviewDescription").innerHTML =
        marked.parse(rawDescription);

    adminReviewModal.classList.add("active");
};

// دالة إغلاق النافذة
window.closeAdminReview = function () {
    adminReviewModal.classList.remove("active");
    currentPendingDeckId = null;
};

// دالة القبول من نافذة المراجعة
window.approveFromReview = function () {
    if (!currentPendingDeckId) return;

    // 1. احفظ الـ ID في متغير منفصل قبل أي حاجة
    const targetDeckId = currentPendingDeckId;
    const deck = window.allDecksData.find((d) => d.id === targetDeckId);

    // 2. اقفل النافذة (والتي ستصفر currentPendingDeckId لكن targetDeckId في أمان)
    closeAdminReview();

    // 3. أرسل المتغير المحفوظ لدالة القبول
    window.approveDeck(targetDeckId, deck ? deck.title : "Deck");
};

let deckToReject = null;

// 1. دالة تفتح نافذة الرفض مباشرة من زر الجدول
window.openRejectionModal = function (id) {
    deckToReject = id;
    document.getElementById("rejectionModal").classList.add("active");
};

// تعديل دالة الرفض من نافذة المراجعة لتفتح نافذة الأسباب
window.rejectFromReview = function () {
    if (!currentPendingDeckId) return;
    deckToReject = currentPendingDeckId;
    closeAdminReview();
    document.getElementById("rejectionModal").classList.add("active"); // فتح نافذة أسباب الرفض
};

window.closeRejectionModal = function () {
    document.getElementById("rejectionModal").classList.remove("active");
    deckToReject = null;
    // مسح البيانات السابقة
    document
        .querySelectorAll(".reject-cb")
        .forEach((cb) => (cb.checked = false));
    document.getElementById("rejectionNote").value = "";
};

window.submitRejection = async function () {
    if (!deckToReject) return;

    // تجميع الأسباب المحددة
    const reasons = Array.from(
        document.querySelectorAll(".reject-cb:checked"),
    ).map((cb) => cb.value);
    const note = document.getElementById("rejectionNote").value.trim();

    if (reasons.length === 0 && note === "") {
        alert("Please select at least one reason or write a note.");
        return;
    }

    try {
        // تحديث حالة الـ Deck بدلاً من حذفه
        await updateDoc(doc(db, "decks", deckToReject), {
            status: "rejected",
            rejectionReasons: reasons,
            rejectionNote: note,
            updatedAt: serverTimestamp(),
        });

        closeRejectionModal();
        showModal(
            "Rejected",
            "Deck marked as rejected and feedback sent to creator.",
            "success",
        );
        loadDecks(); // تحديث الجدول
    } catch (error) {
        console.error("Error rejecting deck:", error);
        showModal("Error", "Failed to reject deck.", "error");
    }
};
