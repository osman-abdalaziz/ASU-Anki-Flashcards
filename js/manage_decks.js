import { db, auth } from "./config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, getDocs, doc, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// التحقق من الأدمن (نفس الكود السابق)
const ADMIN_EMAIL = "osmanabdalaziz2005@gmail.com"; // 🔴 ضع ايميلك
onAuthStateChanged(auth, (user) => {
    if (!user || user.email !== ADMIN_EMAIL) {
        window.location.href = "../index";
    }
});

const tableBody = document.getElementById('decksTableBody');

// 1. دالة جلب وعرض البيانات
// 1. تعديل دالة التحميل لإضافة Data Attributes
async function loadDecks() {
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Loading...</td></tr>';

    try {
        const querySnapshot = await getDocs(collection(db, "decks"));
        tableBody.innerHTML = '';

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();

            // 🔥 إضافة data-attributes ليسهل علينا الفلترة لاحقاً
            // نضع القيم بحروف صغيرة (lowercase) لتجنب مشاكل المطابقة
            const yearVal = data.year ? data.year.toLowerCase() : '';
            const catVal = data.category ? data.category.toLowerCase() : '';

            // 🔥 1. تحديد حالة الزر (هل هو مخفي الآن أم ظاهر؟)
            const isHidden = data.isHidden === true; // تأكد أنها boolean

            // 🔥 2. تصميم الزر بناءً على الحالة
            // إذا كان مخفياً: زر أخضر (Unhide)
            // إذا كان ظاهراً: زر برتقالي (Hide)
            const hideBtnClass = isHidden ? 'unhide-btn' : 'hide-btn';
            const hideBtnText = isHidden ? 'Unhide' : 'Hide';
            const hideBtnIcon = isHidden ? 'fa-eye' : 'fa-eye-slash';
            const hideBtnAction = isHidden ? false : true; // القيمة الجديدة التي سنرسلها

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

// 2. دوال الحذف والتعديل (Global Functions)
window.deleteDeck = async (id) => {
    if (confirm("Are you sure you want to delete this deck?")) {
        try {
            await deleteDoc(doc(db, "decks", id));
            showModal("Deleted successfully!", "The Deck Is Deleted Successfully", 'success')
            loadDecks(); // تحديث الجدول
        } catch (error) {
            showModal("Error: ", error.message, 'error')
        }
    }
};

// فتح المودل وتعبئة البيانات
window.openEditModal = (id, title, url, img, version) => {
    document.getElementById('editDeckId').value = id;
    document.getElementById('editTitle').value = title;
    document.getElementById('editUrl').value = url;
    document.getElementById('editimgUrl').value = img;
    document.getElementById('editVersion').value = version;

    document.getElementById('editDeckModal').classList.add('active');
};

window.closeEditModal = () => {
    document.getElementById('editDeckModal').classList.remove('active');
};

// 3. حفظ التعديلات
const editForm = document.getElementById('editDeckForm');
editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editDeckId').value;
    const saveBtn = editForm.querySelector('button');
    saveBtn.innerText = "Saving...";

    try {
        const deckRef = doc(db, "decks", id);
        await updateDoc(deckRef, {
            title: document.getElementById('editTitle').value,
            downloadUrl: document.getElementById('editUrl').value,
            imageUrl: document.getElementById('editimgUrl').value,
            version: document.getElementById('editVersion').value,
            // يمكنك إضافة باقي الحقول هنا إذا أردت تعديلها أيضاً
        });
        showModal("Updated!", "The Deck Is Updated Successfully", 'success')
        closeEditModal();
        loadDecks(); // تحديث الجدول

    } catch (error) {
        showModal("Error: ", error.message, 'error')
    } finally {
        saveBtn.innerText = "Save Changes";
    }
});

// تشغيل عند التحميل
document.addEventListener('DOMContentLoaded', loadDecks);

function showModal(title, message, type = 'success') {
    const overlay = document.getElementById('customModal');
    const box = overlay.querySelector('.modal-box');
    const titleEl = document.getElementById('modalTitle');
    const msgEl = document.getElementById('modalMessage');
    const iconEl = document.getElementById('modalIconClass');
    const btn = document.getElementById('modalOkBtn');

    // تعبئة البيانات
    titleEl.textContent = title;
    msgEl.textContent = message;

    // تنسيق حسب النوع (نجاح أو خطأ)
    box.className = 'modal-box'; // reset classes
    if (type === 'success') {
        box.classList.add('success');
        iconEl.className = 'fa-solid fa-check';
    } else {
        box.classList.add('error');
        iconEl.className = 'fa-solid fa-xmark';
    }

    // إظهار المودل
    overlay.classList.add('active');

    // إغلاق المودل عند الضغط
    btn.onclick = () => overlay.classList.remove('active');
}


// ==========================================
// 4. نظام الفلترة الموحد (Unified Filtering Logic) 🧠🔍
// ==========================================
const searchInput = document.getElementById('searchDecksInput');
const yearSelect = document.getElementById('filterYear');
const catSelect = document.getElementById('filterCategory');

function filterDecks() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedYear = yearSelect.value.toLowerCase(); // 1st year...
    const selectedCat = catSelect.value.toLowerCase();   // theoretical...

    const rows = document.querySelectorAll('#decksTableBody tr');

    rows.forEach(row => {
        // 1. البحث بالنص (في العنوان والموديول)
        const text = row.textContent.toLowerCase();
        const matchesSearch = text.includes(searchTerm);

        // 2. البحث بالسنة (من الـ data attribute المخفي)
        const rowYear = row.getAttribute('data-year');
        const matchesYear = selectedYear === 'all' || rowYear === selectedYear;

        // 3. البحث بالتصنيف (من الـ data attribute المخفي)
        const rowCat = row.getAttribute('data-category');
        const matchesCat = selectedCat === 'all' || rowCat === selectedCat;

        // إظهار الصف فقط إذا تحقق الشروط الثلاثة معاً (AND Logic)
        if (matchesSearch && matchesYear && matchesCat) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// ربط الأحداث بالدالة الموحدة
if (searchInput) searchInput.addEventListener('keyup', filterDecks);
if (yearSelect) yearSelect.addEventListener('change', filterDecks);
if (catSelect) catSelect.addEventListener('change', filterDecks);

window.toggleDeckVisibility = async (id, currentStatus) => {
    const newStatus = !currentStatus; // عكس الحالة الحالية
    const actionText = newStatus ? "Hidden" : "Visible"; // للنصوص التوضيحية

    try {
        const deckRef = doc(db, "decks", id);

        // تحديث الحقل في قاعدة البيانات
        await updateDoc(deckRef, {
            isHidden: newStatus
        });

        // رسالة نجاح
        showModal(
            "Status Updated!",
            `The deck is now ${actionText}.`,
            "success"
        );

        // إعادة تحميل الجدول لرؤية التغيير
        loadDecks();

    } catch (error) {
        console.error("Error updating visibility:", error);
        showModal("Error", "Failed to update status.", "error");
    }
};