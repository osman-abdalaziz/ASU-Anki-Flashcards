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

// 1. حماية الصفحة
const ADMIN_EMAIL = "osmanabdalaziz2005@gmail.com";
onAuthStateChanged(auth, (user) => {
    if (!user || user.email !== ADMIN_EMAIL) {
        window.location.href = "../index.html";
    } else {
        // تعبئة صورة الأدمن
        const avatar = document.getElementById("mobileUserAvatar");
        if (avatar) avatar.src = user.photoURL || "../images/user.png";
    }
});

const tableBody = document.getElementById("reviewsTableBody");
let decksMap = {}; // لتخزين أسماء الكروت: { id: "Deck Title" }

// 2. دالة التحميل الرئيسية
async function loadReviews() {
    tableBody.innerHTML =
        '<tr><td colspan="6" style="text-align:center;">Loading reviews...</td></tr>';

    try {
        // أ) جلب أسماء الكروت أولاً (لتفادي ظهور ID بدلاً من الاسم)
        const decksSnapshot = await getDocs(collection(db, "decks"));
        decksSnapshot.forEach((doc) => {
            decksMap[doc.id] = doc.data().title;
        });

        // ب) جلب التقييمات من كل الكروت (Collection Group Query)
        // ملاحظة: قد يطلب منك الفايربيس إنشاء Index في الكونسول عند تشغيل هذا السطر لأول مرة
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

            // استخراج معرف الكارت الأب (Parent Deck ID)
            const deckId = docSnap.ref.parent.parent.id;
            const deckTitle = decksMap[deckId] || "Unknown Deck";

            // تنسيق التاريخ
            let dateStr = "N/A";
            if (data.createdAt && data.createdAt.seconds) {
                const dateObj = new Date(data.createdAt.seconds * 1000);
                dateStr = dateObj.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short", // اسم الشهر مختصر (Jan, Feb...)
                    day: "numeric",
                });
            }

            // تحويل الرقم لنجوم
            const stars = getStars(data.rating);

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
        // التعامل مع خطأ نقص الـ Index
        if (error.message.includes("indexes")) {
            tableBody.innerHTML =
                '<tr><td colspan="6" style="color:red; text-align:center;">Missing Index! Check Console for link to create it.</td></tr>';
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

// 3. حذف التقييم (مع تحديث إحصائيات الكارت)
window.deleteReview = async (reviewId, deckId, rating) => {
    if (
        !confirm(
            "Are you sure? This will remove the review and update the deck rating."
        )
    )
        return;

    try {
        // أ) حذف وثيقة التقييم
        // نحتاج للمسار الكامل، وبما أننا لا نملك المسار المباشر هنا بسهولة،
        // سنعتمد على أننا نعرف deckId و reviewId
        const reviewRef = doc(db, "decks", deckId, "reviews", reviewId);
        await deleteDoc(reviewRef);

        // ب) تحديث الكارت (طرح التقييم والعدد)
        const deckRef = doc(db, "decks", deckId);
        await updateDoc(deckRef, {
            totalReviews: increment(-1),
            totalStars: increment(-rating),
        });

        showModal("Deleted!", "Review removed successfully.", "success");
        loadReviews(); // إعادة تحميل الجدول
    } catch (error) {
        console.error(error);
        showModal("Error", error.message, "error");
    }
};

// 4. البحث في الجدول
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

// تشغيل
document.addEventListener("DOMContentLoaded", loadReviews);

// دالة المودل (للتكرار)
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
