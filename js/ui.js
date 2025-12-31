// js/ui.js

// export function updateNavbarUI(user) {
//     // عناصر الكمبيوتر
//     const loginBtn = document.getElementById('loginBtn');
//     const userProfile = document.getElementById('userProfile');
//     const userAvatar = document.getElementById('userAvatar');
//     const userName = document.getElementById('userName');
//     const notifWrapper = document.getElementById('notificationsWrapper');

//     // عناصر الموبايل (الأسماء الجديدة)
//     const mobileLoginBtn = document.getElementById('mobileLoginBtn');
//     const mobileUserProfile = document.getElementById('mobileUserProfile');
//     const mobileUserAvatar = document.getElementById('mobileUserAvatar');
//     const mobileUserName = document.getElementById('mobileUserName');
//     const mobileNotifWrapper = document.getElementById('mobileNotifWrapper'); // <--- جديد
//     const mobileLogoutBtn = document.getElementById('mobileLogoutBtn'); // <--- جديد

//     if (user) {
//         // --- حالة: مسجل دخول ---

//         // إخفاء أزرار الدخول
//         if (loginBtn) loginBtn.style.display = 'none';
//         if (mobileLoginBtn) mobileLoginBtn.style.display = 'none';

//         // إظهار البروفايل والإشعارات (في المكانين)
//         if (userProfile) userProfile.style.display = 'flex';
//         if (notifWrapper) notifWrapper.style.display = 'flex';

//         if (mobileUserProfile) mobileUserProfile.style.display = 'flex';
//         if (mobileNotifWrapper) mobileNotifWrapper.style.display = 'flex'; // <--- إظهار جرس الموبايل

//         if (mobileLogoutBtn) mobileLogoutBtn.style.display = 'flex'; // <--- إظهار زر الخروج في الموبايل

//         // تعبئة البيانات
//         const photo = user.photoURL || "images/user.png";
//         // 1. نجلب الاسم الكامل (أو نضع Student كاحتياطي)
//         const fullName = user.displayName || "Student";

//         // 2. نقسم الاسم عند كل مسافة، ونأخذ أول جزء فقط [0]
//         const firstName = "Welcome, " + fullName.split(' ')[0];

//         if (userAvatar) userAvatar.src = photo;
//         if (userName) userName.textContent = firstName;

//         if (mobileUserAvatar) mobileUserAvatar.src = photo;
//         if (mobileUserName) mobileUserName.textContent = firstName;
//     } else {
//         // --- حالة: زائر ---
//         if (loginBtn) loginBtn.style.display = 'flex';
//         if (mobileLoginBtn) mobileLoginBtn.style.display = 'flex';

//         if (userProfile) userProfile.style.display = 'none';
//         if (notifWrapper) notifWrapper.style.display = 'none';

//         if (mobileLogoutBtn) mobileLogoutBtn.style.display = 'none'; // <--- إخفاء زر الخروج في الموبايل

//         if (mobileUserProfile) mobileUserProfile.style.display = 'none';
//         if (mobileNotifWrapper) mobileNotifWrapper.style.display = 'none'; // <--- إخفاء جرس الموبايل
//     }
// }

// في ملف js/ui.js

const ADMIN_EMAIL = "osmanabdalaziz2005@gmail.com"; // 🔴 إيميلك هنا

export function updateNavbarUI(user) {
    // عناصر الكمبيوتر
    const loginBtn = document.getElementById('loginBtn');
    const userProfile = document.getElementById('userProfile');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const notifWrapper = document.getElementById('notificationsWrapper');

    // عناصر الموبايل
    const mobileLoginBtn = document.getElementById('mobileLoginBtn');
    const mobileUserProfile = document.getElementById('mobileUserProfile');
    const mobileUserAvatar = document.getElementById('mobileUserAvatar');
    const mobileUserName = document.getElementById('mobileUserName');
    const mobileNotifWrapper = document.getElementById('mobileNotifWrapper');
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');

    if (user) {
        // --- حالة: مسجل دخول ---

        // 1. إخفاء أزرار الدخول وإظهار البروفايل
        if (loginBtn) loginBtn.style.display = 'none';
        if (mobileLoginBtn) mobileLoginBtn.style.display = 'none';
        if (userProfile) userProfile.style.display = 'flex';
        if (notifWrapper) notifWrapper.style.display = 'flex';
        if (mobileUserProfile) mobileUserProfile.style.display = 'flex';
        if (mobileNotifWrapper) mobileNotifWrapper.style.display = 'flex';
        if (mobileLogoutBtn) mobileLogoutBtn.style.display = 'flex';

        // 2. تعبئة البيانات (الصور والاسم)
        const photo = user.photoURL || "images/user.png";
        const fullName = user.displayName || "Student";
        const firstName = "Welcome, " + fullName.split(' ')[0];

        if (userAvatar) userAvatar.src = photo;
        if (userName) userName.textContent = firstName;
        if (mobileUserAvatar) mobileUserAvatar.src = photo;
        if (mobileUserName) mobileUserName.textContent = firstName;

        // 🔥🔥🔥 3. إضافة زر الداشبورد (للأدمن فقط) 🔥🔥🔥
        if (user.email === ADMIN_EMAIL) {
            addDashboardBtn('userDropdown');       // للقائمة العلوية
            addDashboardBtn('mobileUserDropdown'); // لقائمة الموبايل
        } else {
            // إزالة الزر إذا دخل طالب عادي (في حال كنت مسجلاً كأدمن قبله)
            removeDashboardBtn('userDropdown');
            removeDashboardBtn('mobileUserDropdown');
        }

    } else {
        // --- حالة: زائر ---
        if (loginBtn) loginBtn.style.display = 'flex';
        if (mobileLoginBtn) mobileLoginBtn.style.display = 'flex';
        if (userProfile) userProfile.style.display = 'none';
        if (notifWrapper) notifWrapper.style.display = 'none';
        if (mobileLogoutBtn) mobileLogoutBtn.style.display = 'none';
        if (mobileUserProfile) mobileUserProfile.style.display = 'none';
        if (mobileNotifWrapper) mobileNotifWrapper.style.display = 'none';
    }
}

// --- دوال مساعدة لحقن الزر ---

function addDashboardBtn(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    // نتأكد أولاً أن الزر غير موجود (عشان ما نكرره)
    if (dropdown.querySelector('.admin-dash-btn')) return;

    // إنشاء رابط الداشبورد
    const link = document.createElement('a');
    link.href = "dashboard/index.html";
    link.className = "admin-dash-btn";
    link.innerHTML = 'Dashboard <i class="fa-solid fa-gauge-high fa-fw"></i>';

    // تنسيق الزر ليبدو مثل الأزرار الأخرى لكن بلونك الأزرق المميز
    link.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 10px 15px;
        background-color: var(--main-color); 
        color: #ffffff;
        border: none;
        font-size: 14px;
        cursor: pointer;
        border-radius: 10px;
        margin-bottom: 8px;
        text-decoration: none;
        box-sizing: border-box;
        transition: 0.3s;
    `;

    // وضعه في بداية القائمة (فوق زر الخروج)
    dropdown.insertBefore(link, dropdown.firstChild);
}

function removeDashboardBtn(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    const btn = dropdown.querySelector('.admin-dash-btn');
    if (btn) btn.remove();
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

// في ملف js/ui.js

export function showModal(title, message, type = 'success', onClose = null) {
    const overlay = document.getElementById('customModal');
    // حماية: في حال نسيت وضع كود HTML في الصفحة
    if (!overlay) {
        alert(message);
        if (onClose) onClose();
        return;
    }

    const box = overlay.querySelector('.modal-box');
    const titleEl = document.getElementById('modalTitle');
    const msgEl = document.getElementById('modalMessage');
    const iconEl = document.getElementById('modalIconClass');
    const btn = document.getElementById('modalOkBtn');

    // تعبئة النصوص
    titleEl.textContent = title;
    msgEl.innerHTML = message;

    // تنظيف الكلاسات القديمة وتحديد اللون
    box.className = 'modal-box';
    if (type === 'success') {
        box.classList.add('success');
        iconEl.className = 'fa-solid fa-check';
    } else if (type === 'error') {
        box.classList.add('error');
        iconEl.className = 'fa-solid fa-xmark';
    } else {
        box.classList.add('info');
        iconEl.className = 'fa-solid fa-info';
    }

    // إظهار المودل
    overlay.classList.add('active');

    // 🔥 هذا هو الحل: تنفيذ التوجيه فقط عند الضغط على الزر
    btn.onclick = () => {
        overlay.classList.remove('active'); // إخفاء المودل
        if (onClose) {
            onClose(); // تنفيذ دالة الانتقال (التوجيه)
        }
    };
}