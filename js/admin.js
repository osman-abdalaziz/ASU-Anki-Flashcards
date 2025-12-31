import { auth, db } from "./config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
// لاحظ: استوردنا doc و setDoc للتعامل مع الـ ID المخصص
import { collection, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔴 هام: ضع إيميلك هنا (نفس الإيميل الموجود في قواعد الأمان)
const ADMIN_EMAIL = "osmanabdalaziz2005@gmail.com";

// ==========================================
// 1. حماية الصفحة (Admin Guard) 🛡️
// ==========================================
function initAdminGuard() {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // هل المستخدم هو الأدمن؟
            if (user.email !== ADMIN_EMAIL) {
                showModal('Access Denied!', "⛔ Admins Only!", 'error');
                window.location.href = "../index"; // طرد للموقع الرئيسي
            } else {
                // تعبئة بيانات الأدمن في الواجهة
                const avatar = document.getElementById('mobileUserAvatar');
                const name = document.getElementById('mobileUserName');
                if (avatar) avatar.src = user.photoURL || "../images/user.png";
                // if (name) name.textContent = "Welcome, " + (user.displayName || "Osman");

                // إظهار المحتوى
                document.body.style.display = 'flex';
            }
        } else {
            // غير مسجل دخول
            window.location.href = "../signin";
        }
    });
}

// ==========================================
// 2. منطق إضافة الكارت (Add Deck) 🃏
// ==========================================
function setupDeckForm() {
    const submitBtn = document.querySelector('.submit-deck');

    // التأكد أننا في الصفحة الصحيحة (صفحة الكروت)
    if (!submitBtn) return;

    submitBtn.addEventListener('click', async (e) => {
        e.preventDefault(); // منع تحديث الصفحة

        // تغيير حالة الزر للتحميل
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...';
        submitBtn.disabled = true;

        try {
            // دالة مساعدة لجلب القيمة
            const getVal = (name) => document.querySelector(`[name="${name}"]`).value;

            // --- 1. معالجة التاريخ (Format: Dec 5, 2025) ---
            let dateVal = getVal('lastUpdated');
            const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };

            // الافتراضي تاريخ اليوم
            let formattedDate = new Date().toLocaleDateString('en-US', dateOptions);
            // إذا اختار الأدمن تاريخاً محدداً
            if (dateVal) {
                const d = new Date(dateVal);
                formattedDate = d.toLocaleDateString('en-US', dateOptions);
            }

            // --- 2. تجهيز البيانات ---
            const title = getVal('title'); // حفظ العنوان لاستخدامه في الـ ID

            const deckData = {
                title: title,
                description: getVal('description'),
                module: getVal('module'),
                creator: getVal('creator') || "Dr. Ahmed",
                downloadUrl: getVal('downloadUrl'),
                imageUrl: getVal('thumbnailUrl'),
                year: getVal('year'),
                category: getVal('category'),
                version: getVal('version') || "v1.0",
                lastUpdate: formattedDate, // التاريخ المنسق
                createdAt: new Date(), // للتريب الداخلي
                isHidden: false
            };

            // التحقق من الحقول الإجبارية
            if (!deckData.title || !deckData.downloadUrl) {
                throw new Error("Title and Download URL are required!");
            }

            // --- 3. توليد الـ ID تلقائياً (Auto-generate ID) ---
            // تحويل العنوان إلى صيغة ID (مثلاً: "CNS Module" -> "cns-module")
            const generatedId = title.toLowerCase().trim().replace(/\s+/g, '-');

            console.log("Saving Doc with ID:", generatedId);

            // --- 4. الحفظ في فايربيس ---
            // نستخدم setDoc بدلاً من addDoc لنحدد الـ ID بأنفسنا
            await setDoc(doc(db, "decks", generatedId), deckData);

            // رسالة النجاح
            showModal('Awesome!', `Deck "${deckData.title}" has been saved successfully.`, 'success');

            // تصفير الفورم
            document.querySelector('.decks-form').reset();

        } catch (error) {
            console.error("Error adding deck:", error);
            showModal('Oops!', error.message, 'error');
        } finally {
            // استعادة الزر
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// تشغيل الدوال عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    initAdminGuard(); // تشغيل الحماية
    setupDeckForm();  // تشغيل فورم الكروت
});


// ==========================================
// 3. دالة المودل الاحترافي (Custom Modal Logic) ✨
// ==========================================
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