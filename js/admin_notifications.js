import { auth, db } from "./config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔴 هام: ضع إيميلك هنا
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
                window.location.href = "../index.html"; // طرد للموقع الرئيسي
            } else {
                // تعبئة بيانات الأدمن
                const avatar = document.getElementById('mobileUserAvatar');
                const name = document.getElementById('mobileUserName');
                if (avatar) avatar.src = user.photoURL || "../images/user.png";
                // if (name) name.textContent = "Welcome, " + (user.displayName || "Osman Abdalaziz");

                // إظهار المحتوى
                document.body.style.display = 'flex';
            }
        } else {
            // غير مسجل دخول
            window.location.href = "../signin.html";
        }
    });
}

// ==========================================
// 2. منطق إرسال الإشعار (Push Notification) 🔔
// ==========================================
function setupNotifForm() {
    // نحدد الزر باستخدام الكلاس الموجود في HTML الخاص بك
    const submitBtn = document.querySelector('.submit-deck');

    if (!submitBtn) return;

    submitBtn.addEventListener('click', async (e) => {
        e.preventDefault(); // منع تحديث الصفحة

        // تغيير حالة الزر للتحميل
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Pushing...';
        submitBtn.disabled = true;

        try {
            // دالة لجلب القيمة من الحقل
            const getVal = (name) => document.querySelector(`[name="${name}"]`).value;

            // --- معالجة التاريخ ---
            let dateVal = getVal('createdDate');
            let timestamp;

            if (dateVal) {
                // إذا اخترت تاريخاً محدداً، نحوله لصيغة فايربيس
                timestamp = Timestamp.fromDate(new Date(dateVal));
            } else {
                // إذا تركته فارغاً، نستخدم الوقت الحالي
                timestamp = Timestamp.now();
            }

            // --- تجميع البيانات ---
            const notifData = {
                title: getVal('title'),
                message: getVal('message'),
                link: getVal('link'),
                type: getVal('type'), // info, danger, success
                createdAt: timestamp // هذا هو الحقل الذي يستخدمه db.js للترتيب
            };

            // التحقق من الحقول الأساسية
            if (!notifData.title || !notifData.message) {
                throw new Error("Title and Message are required!");
            }

            // --- الإرسال لفايربيس ---
            // نستخدم addDoc لأننا لا نهتم بالـ ID هنا (نريده عشوائياً)
            await addDoc(collection(db, "general_notifications"), notifData);

            // رسالة النجاح
            showModal('Notification Sent!', `Your notification "${notifData.title}" is now live.`, 'success');
            // تصفير الفورم
            document.querySelector('.decks-form').reset();

        } catch (error) {
            console.error("Error pushing notification:", error);
            showModal('Error Sending', error.message, 'error');
        } finally {
            // استعادة الزر
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// تشغيل الدوال عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    initAdminGuard();
    setupNotifForm();
});

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