// js/ui.js

export function updateNavbarUI(user) {
    // عناصر الكمبيوتر
    const loginBtn = document.getElementById('loginBtn');
    const userProfile = document.getElementById('userProfile');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const notifWrapper = document.getElementById('notificationsWrapper');

    // عناصر الموبايل (الأسماء الجديدة)
    const mobileLoginBtn = document.getElementById('mobileLoginBtn');
    const mobileUserProfile = document.getElementById('mobileUserProfile');
    const mobileUserAvatar = document.getElementById('mobileUserAvatar');
    const mobileUserName = document.getElementById('mobileUserName');
    const mobileNotifWrapper = document.getElementById('mobileNotifWrapper'); // <--- جديد
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn'); // <--- جديد

    if (user) {
        // --- حالة: مسجل دخول ---

        // إخفاء أزرار الدخول
        if (loginBtn) loginBtn.style.display = 'none';
        if (mobileLoginBtn) mobileLoginBtn.style.display = 'none';

        // إظهار البروفايل والإشعارات (في المكانين)
        if (userProfile) userProfile.style.display = 'flex';
        if (notifWrapper) notifWrapper.style.display = 'flex';

        if (mobileUserProfile) mobileUserProfile.style.display = 'flex';
        if (mobileNotifWrapper) mobileNotifWrapper.style.display = 'flex'; // <--- إظهار جرس الموبايل

        if (mobileLogoutBtn) mobileLogoutBtn.style.display = 'flex'; // <--- إظهار زر الخروج في الموبايل

        // تعبئة البيانات
        const photo = user.photoURL || "images/user.png";
        // 1. نجلب الاسم الكامل (أو نضع Student كاحتياطي)
        const fullName = user.displayName || "Student";

        // 2. نقسم الاسم عند كل مسافة، ونأخذ أول جزء فقط [0]
        const firstName = "Welcome, " + fullName.split(' ')[0];

        if (userAvatar) userAvatar.src = photo;
        if (userName) userName.textContent = firstName;

        if (mobileUserAvatar) mobileUserAvatar.src = photo;
        if (mobileUserName) mobileUserName.textContent = firstName;
    } else {
        // --- حالة: زائر ---
        if (loginBtn) loginBtn.style.display = 'flex';
        if (mobileLoginBtn) mobileLoginBtn.style.display = 'flex';

        if (userProfile) userProfile.style.display = 'none';
        if (notifWrapper) notifWrapper.style.display = 'none';

        if (mobileLogoutBtn) mobileLogoutBtn.style.display = 'none'; // <--- إخفاء زر الخروج في الموبايل

        if (mobileUserProfile) mobileUserProfile.style.display = 'none';
        if (mobileNotifWrapper) mobileNotifWrapper.style.display = 'none'; // <--- إخفاء جرس الموبايل
    }
}

// دالة لإظهار رسالة الخطأ
export function showError(message) {
    const errorBox = document.getElementById('errorMessage');
    if (errorBox) {
        errorBox.textContent = message; // وضع نص الرسالة
        errorBox.style.display = 'block'; // إظهار الصندوق
    }
}

// دالة لتنظيف الرسالة (مثلاً عند بدء الكتابة من جديد)
export function clearError() {
    const errorBox = document.getElementById('errorMessage');
    if (errorBox) {
        errorBox.style.display = 'none';
    }
}

// دالة لتبديل حالة الزر (تحميل / عادي)
export function setButtonLoading(button, isLoading) {
    if (!button) return;

    if (isLoading) {
        // 1. حفظ النص الأصلي في سمة بيانات (data attribute) لنستعيده لاحقاً
        button.dataset.originalText = button.innerHTML;

        // 2. تغيير المحتوى لسبينر + كلمة Loading
        // لاحظ أننا حافظنا على العرض (Width) تقريباً لكي لا يتغير حجم الزر فجأة
        button.innerHTML = '<span class="spinner"></span> Processing...';

        // 3. تعطيل الزر
        button.classList.add('btn-loading');
        button.disabled = true;

    } else {
        // العودة للوضع الطبيعي (في حالة حدوث خطأ)
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
        }
        button.classList.remove('btn-loading');
        button.disabled = false;
    }
}

// دالة القائمة المنسدلة (كما هي)
export function toggleDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
        dropdown.classList.toggle('active');
    }
}

// دالة جديدة لتبديل قائمة الإشعارات
export function toggleNotifications(dropdownId, notifBadge) {
    const dropdown = document.getElementById(dropdownId);
    const badge = document.getElementById(notifBadge);

    if (dropdown) {
        const isActive = dropdown.classList.toggle('active');

        // عند الفتح، نخفي النقطة الحمراء (كأن المستخدم قرأ الإشعارات)
        if (isActive && badge) {
            badge.style.display = 'none';
        }
    }
} 