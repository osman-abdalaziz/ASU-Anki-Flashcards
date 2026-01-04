import { db, auth } from "./config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    getDocs,
    doc,
    deleteDoc,
    updateDoc,
    collectionGroup,
    query,
    orderBy,
    increment,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. حماية الصفحة + تشغيل التحميل بعد التأكد من الهوية
const ADMIN_EMAIL = "osmanabdalaziz2005@gmail.com";
onAuthStateChanged(auth, (user) => {
    if (!user || user.email !== ADMIN_EMAIL) {
        window.location.href = "../index.html";
    } else {
        // تعبئة صورة الأدمن
        const avatar = document.getElementById("mobileUserAvatar");
        if (avatar) avatar.src = user.photoURL || "../images/user.png";

        // 🔥🔥 التعديل هنا: تشغيل التحميل بعد التأكد من الدخول فقط 🔥🔥
        loadReviews();
    }
});

const tableBody = document.getElementById("reviewsTableBody");
let decksMap = {}; // لتخزين أسماء الكروت: { id: "Deck Title" }

// 2. دالة التحميل الرئيسية
async function loadReviews() {
    // التأكد من وجود العنصر قبل الكتابة فيه
    if (!tableBody) return;

    tableBody.innerHTML =
        '<tr><td colspan="6" style="text-align:center;">Loading reviews...</td></tr>';

    try {
        // أ) جلب أسماء الكروت أولاً
        const decksSnapshot = await getDocs(collection(db, "decks"));
        decksSnapshot.forEach((doc) => {
            decksMap[doc.id] = doc.data().title;
        });

        // ب) جلب التقييمات من كل الكروت
        const reviewsQuery = query(
            collectionGroup(db, "reviews"),
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(reviewsQuery);

        tableBody.innerHTML = "";

        if (querySnapshot.empty) {
            tableBody.innerHTML =
                '<tr><td colspan="6" style="text-align:center;">No reviews found yet.</td></tr>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();

            // استخراج معرف الكارت الأب
            let deckTitle = "Unknown Deck";
            try {
                // محاولة الوصول للأب (قد يفشل لو المسار مختلف)
                const deckId = docSnap.ref.parent.parent.id;
                deckTitle = decksMap[deckId] || deckId;
            } catch (e) {
                console.warn("Could not determine parent deck");
            }

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

            // تحويل الرقم لنجوم
            const stars = getStars(data.rating);

            // استخراج deckId للحذف
            const deckId = docSnap.ref.parent.parent
                ? docSnap.ref.parent.parent.id
                : null;

            const row = `
                <tr> 
                    <td style="font-weight:500; color: var(--main-color);">${deckTitle}</td>
                    <td>${data.userName || "Anonymous"}</td>
                    <td><div style="display:flex; color:#ffb142;">${stars}</div></td>
                    <td style="max-width: 300px; font-size: 0.9rem;">${
                        data.comment || "<em style='color:#777'>No comment</em>"
                    }</td>
                    <td>${dateStr}</td>
                    <td>
                        <button class="action-btn delete" onclick="window.deleteReview('${
                            docSnap.id
                        }', '${deckId}', ${data.rating})">
                            Delete <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    } catch (error) {
        console.error("Error loading reviews:", error);
        if (error.message.includes("indexes")) {
            tableBody.innerHTML =
                '<tr><td colspan="6" style="color:red; text-align:center;">Missing Index! Check Console for link.</td></tr>';
        } else {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Error: ${error.message}</td></tr>`;
        }
    }
}

// دالة مساعدة لرسم النجوم
function getStars(rating) {
    let html = "";
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) html += '<i class="fa-solid fa-star"></i>';
        else html += '<i class="fa-regular fa-star" style="color:#555"></i>';
    }
    return html;
}

// 3. حذف التقييم
window.deleteReview = async (reviewId, deckId, rating) => {
    if (!deckId) {
        showModal("Error", "Cannot identify Deck ID", "error");
        return;
    }

    const isConfirmed = await window.showConfirm(
        "Delete Review?",
        "Are you sure? This will remove the review and update ratings.",
        "warning"
    );

    if (!isConfirmed) return;

    try {
        // حذف الوثيقة
        const reviewRef = doc(db, "decks", deckId, "reviews", reviewId);
        await deleteDoc(reviewRef);

        // تحديث الكارت
        const deckRef = doc(db, "decks", deckId);
        await updateDoc(deckRef, {
            totalReviews: increment(-1),
            totalStars: increment(-rating),
            // نحدث التاريخ أيضاً لكي يشعر الطلاب بالتغيير في التقييم
            // updatedAt: serverTimestamp() // يمكن إضافتها إذا استوردت serverTimestamp
        });

        showModal("Deleted!", "Review removed successfully.", "success");
        loadReviews();
    } catch (error) {
        console.error(error);
        showModal("Error", error.message, "error");
    }
};

// 4. البحث
const searchInput = document.getElementById("searchReviewsInput");
if (searchInput) {
    searchInput.addEventListener("keyup", () => {
        const val = searchInput.value.toLowerCase();
        const rows = document.querySelectorAll("#reviewsTableBody tr");
        rows.forEach((row) => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(val) ? "" : "none";
        });
    });
}

// 🔥 حذفنا سطر document.addEventListener("DOMContentLoaded", loadReviews); لأننا وضعناه داخل الـ Auth

// دوال المودل (كما هي)
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

window.showConfirm = (title, message, type = "warning") => {
    return new Promise((resolve) => {
        const overlay = document.getElementById("customModal");
        const titleEl = document.getElementById("modalTitle");
        const msgEl = document.getElementById("modalMessage");
        const iconEl = document.getElementById("modalIconClass");
        const okBtn = document.getElementById("modalOkBtn");
        const cancelBtn = document.getElementById("modalCancelBtn");
        const box = overlay.querySelector(".modal-box");

        titleEl.textContent = title;
        msgEl.textContent = message;

        cancelBtn.style.display = "inline-block";
        okBtn.textContent = "Confirm";

        box.className = "modal-box";
        if (type === "warning") {
            box.classList.add("error");
            iconEl.className = "fa-solid fa-triangle-exclamation";
            okBtn.style.backgroundColor = "#ff5252";
        } else {
            box.classList.add("info");
            iconEl.className = "fa-solid fa-circle-question";
            okBtn.style.backgroundColor = "var(--main-color)";
        }

        overlay.classList.add("active");

        const handleOk = () => {
            cleanup();
            resolve(true);
        };
        const handleCancel = () => {
            cleanup();
            resolve(false);
        };

        function cleanup() {
            okBtn.removeEventListener("click", handleOk);
            cancelBtn.removeEventListener("click", handleCancel);
            overlay.classList.remove("active");
        }
        okBtn.addEventListener("click", handleOk);
        cancelBtn.addEventListener("click", handleCancel);
    });
};
window.showModal = showModal;
