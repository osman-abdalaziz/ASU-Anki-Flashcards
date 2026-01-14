import { getTelegramBotLink } from "./db.js";
const ADMIN_EMAIL = "osmanabdalaziz2005@gmail.com"; // 🔴 إيميلك هنا

export function updateNavbarUI(user, userData) {
    // عناصر سطح المكتب
    const loginBtn = document.getElementById("loginBtn");
    const userProfile = document.getElementById("userProfile");
    const userAvatar = document.getElementById("userAvatar");
    const userName = document.getElementById("userName");
    const notifWrapper = document.getElementById("notificationsWrapper");

    // عناصر الموبايل
    const mobileLoginBtn = document.getElementById("mobileLoginBtn");
    const mobileUserProfile = document.getElementById("mobileUserProfile");
    const mobileUserAvatar = document.getElementById("mobileUserAvatar");
    const mobileUserName = document.getElementById("mobileUserName");
    const mobileNotifWrapper = document.getElementById("mobileNotifWrapper");
    const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");

    if (user) {
        // --- حالة: مسجل دخول ---
        if (loginBtn) loginBtn.style.display = "none";
        if (mobileLoginBtn) mobileLoginBtn.style.display = "none";

        if (userProfile) userProfile.style.display = "flex";
        if (notifWrapper) notifWrapper.style.display = "flex";
        if (mobileUserProfile) mobileUserProfile.style.display = "flex";
        if (mobileNotifWrapper) mobileNotifWrapper.style.display = "flex";
        if (mobileLogoutBtn) mobileLogoutBtn.style.display = "flex";

        // تعبئة البيانات
        const photo = user.photoURL || "images/user.webp";
        const fullName = user.displayName || "Student";
        const firstName = "Welcome, " + fullName.split(" ")[0];

        if (userAvatar) userAvatar.src = photo;
        if (userName) userName.textContent = firstName;
        if (mobileUserAvatar) mobileUserAvatar.src = photo;
        if (mobileUserName) mobileUserName.textContent = firstName;

        // 🔥🔥🔥 منطق زر الداشبورد الذكي 🔥🔥🔥
        let dashboardUrl = null;

        // 1. هل هو الأدمن (أنت)؟
        if (user.email === ADMIN_EMAIL) {
            dashboardUrl = "dashboard/index.html";
        }
        // 2. هل هو صانع (Maker)؟
        else if (userData && userData.role === "maker") {
            dashboardUrl = "creators/index.html";
        }

        // إذا تم تحديد رابط، أضف الزر، وإلا احذفه
        if (dashboardUrl) {
            addDashboardBtn("userDropdown", dashboardUrl);
            addDashboardBtn("mobileUserDropdown", dashboardUrl);
        } else {
            removeDashboardBtn("userDropdown");
            removeDashboardBtn("mobileUserDropdown");
        }
        // ==========================================
        // 🤖 إضافة زر Telegram (Desktop & Mobile)
        // ==========================================

        // دالة مساعدة لإنشاء وإضافة الزر لأي قائمة
        const addTeleBtnToDropdown = (dropdownId, logoutBtnId, btnId) => {
            const dropdown = document.getElementById(dropdownId);
            const logoutBtn = document.getElementById(logoutBtnId);

            // نتأكد أن القائمة موجودة وأن الزر غير مضاف مسبقاً
            if (dropdown && !document.getElementById(btnId)) {
                const a = document.createElement("a");
                a.id = btnId;
                a.href = "#";
                a.target = "_blank";

                // تنسيق الزر (نفس الستايل بالضبط)
                a.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    width: 100%;
                    padding: 10px 15px;
                    margin-bottom: 8px;
                    background-color: #229ED9;
                    color: white;
                    text-decoration: none;
                    border: none;
                    font-size: 14px;
                    border-radius: 10px;
                    box-sizing: border-box;
                    font-weight: 400;
                    cursor: pointer;
                    transition: opacity 0.2s;
                    font-family: inherit;
                `;

                a.onmouseover = () => (a.style.opacity = "0.9");
                a.onmouseout = () => (a.style.opacity = "1");

                a.innerHTML = `Link Telegram <i class="fa-brands fa-telegram fa-fw"></i>`;

                // جلب الرابط
                getTelegramBotLink(user).then((link) => {
                    if (link && link !== "#") {
                        a.href = link;
                    }
                });

                // إضافته قبل زر الخروج
                if (logoutBtn && dropdown.contains(logoutBtn)) {
                    dropdown.insertBefore(a, logoutBtn);
                } else {
                    dropdown.appendChild(a);
                }
            }
        };

        // 1. إضافة لسطح المكتب
        addTeleBtnToDropdown(
            "userDropdown",
            "logoutBtn",
            "teleLinkBtn_desktop"
        );

        // 2. إضافة للموبايل
        addTeleBtnToDropdown(
            "mobileUserDropdown",
            "mobileLogoutBtn",
            "teleLinkBtn_mobile"
        );
    } else {
        // --- حالة: زائر ---
        if (loginBtn) loginBtn.style.display = "flex";
        if (mobileLoginBtn) mobileLoginBtn.style.display = "flex";

        if (userProfile) userProfile.style.display = "none";
        if (notifWrapper) notifWrapper.style.display = "none";
        if (mobileUserProfile) mobileUserProfile.style.display = "none";
        if (mobileNotifWrapper) mobileNotifWrapper.style.display = "none";
        if (mobileLogoutBtn) mobileLogoutBtn.style.display = "none";
    }
}

// دالة إضافة الزر (تقبل الرابط كمتغير)
function addDashboardBtn(dropdownId, targetUrl) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    // منع التكرار
    if (dropdown.querySelector(".admin-dash-btn")) return;

    const link = document.createElement("a");
    link.href = targetUrl; // 🔗 الرابط الديناميكي
    link.className = "admin-dash-btn";
    link.innerHTML = 'Dashboard <i class="fa-solid fa-gauge-high fa-fw"></i>';

    // تنسيق الزر
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

    // إضافته في بداية القائمة
    dropdown.insertBefore(link, dropdown.firstChild);
}

function removeDashboardBtn(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    const btn = dropdown.querySelector(".admin-dash-btn");
    if (btn) btn.remove();
}

// دالة لإظهار رسالة الخطأ
export function showError(message) {
    const errorBox = document.getElementById("errorMessage");
    if (errorBox) {
        errorBox.textContent = message; // وضع نص الرسالة
        errorBox.style.display = "block"; // إظهار الصندوق
    }
}

// دالة لتنظيف الرسالة (مثلاً عند بدء الكتابة من جديد)
export function clearError() {
    const errorBox = document.getElementById("errorMessage");
    if (errorBox) {
        errorBox.style.display = "none";
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
        button.classList.add("btn-loading");
        button.disabled = true;
    } else {
        // العودة للوضع الطبيعي (في حالة حدوث خطأ)
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
        }
        button.classList.remove("btn-loading");
        button.disabled = false;
    }
}

// دالة القائمة المنسدلة (كما هي)
export function toggleDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
        dropdown.classList.toggle("active");
    }
}

// دالة جديدة لتبديل قائمة الإشعارات
export function toggleNotifications(dropdownId, notifBadge) {
    const dropdown = document.getElementById(dropdownId);
    const badge = document.getElementById(notifBadge);

    if (dropdown) {
        const isActive = dropdown.classList.toggle("active");

        // عند الفتح، نخفي النقطة الحمراء (كأن المستخدم قرأ الإشعارات)
        if (isActive && badge) {
            badge.style.display = "none";
        }
    }
}

// في ملف js/ui.js

export function showModal(
    title,
    message,
    type = "success",
    okBtn = "Ok",
    onClose = null
) {
    const overlay = document.getElementById("customModal");
    // حماية: في حال نسيت وضع كود HTML في الصفحة
    if (!overlay) {
        alert(message);
        if (onClose) onClose();
        return;
    }

    const box = overlay.querySelector(".modal-box");
    const titleEl = document.getElementById("modalTitle");
    const msgEl = document.getElementById("modalMessage");
    const iconEl = document.getElementById("modalIconClass");
    const btn = document.getElementById("modalOkBtn");

    // تعبئة النصوص
    titleEl.textContent = title;
    msgEl.innerHTML = message;
    btn.innerHTML = okBtn;

    // تنظيف الكلاسات القديمة وتحديد اللون
    box.className = "modal-box";
    if (type === "success") {
        box.classList.add("success");
        iconEl.className = "fa-solid fa-check";
        btn.className = "main-btn btn-success";
    } else if (type === "error") {
        box.classList.add("error");
        iconEl.className = "fa-solid fa-xmark";
        btn.className = "main-btn btn-error";
    } else {
        box.classList.add("info");
        iconEl.className = "fa-solid fa-info";
        btn.className = "main-btn btn-info";
    }

    // إظهار المودل
    overlay.classList.add("active");

    // 🔥 هذا هو الحل: تنفيذ التوجيه فقط عند الضغط على الزر
    btn.onclick = () => {
        overlay.classList.remove("active"); // إخفاء المودل
        if (onClose) {
            onClose(); // تنفيذ دالة الانتقال (التوجيه)
        }
    };
}

// ==========================================
// 🔥 نظام المودال الذكي (Smart Modal System) 🔥
// ==========================================

// دالة ضبط الشكل والألوان (تطبق الكلاس على الدائرة الخارجية لتفعيل الهالة)
function configureModalType(box, iconDiv, iconInner, okBtn, type) {
    // 1. تنظيف كلاسات الهالة القديمة من الـ Div الخارجي
    iconDiv.className = "modal-icon";

    // 2. إعادة ضبط زر التأكيد
    okBtn.className = "main-btn";
    okBtn.style.backgroundColor = "";
    okBtn.style.borderColor = "";

    switch (type) {
        case "danger": // أحمر
            iconDiv.classList.add("danger"); // 🔥 تفعيل الهالة الحمراء
            iconInner.className = "fa-solid fa-trash-can"; // أيقونة سلة المهملات
            okBtn.className = "main-btn btn-error";
            break;

        case "success": // أخضر
            iconDiv.classList.add("success"); // 🔥 تفعيل الهالة الخضراء
            iconInner.className = "fa-solid fa-check";
            okBtn.className = "main-btn btn-success";
            break;

        case "warning": // برتقالي
            iconDiv.classList.add("warning"); // 🔥 تفعيل الهالة البرتقالية
            iconInner.className = "fa-solid fa-exclamation";
            okBtn.className = "main-btn btn-warning";
            break;

        case "info": // أزرق
        default:
            iconDiv.classList.add("info"); // 🔥 تفعيل الهالة الزرقاء
            iconInner.className = "fa-solid fa-question";
            okBtn.className = "main-btn btn-info";
            break;
    }
}

// تحديث دالة Confirm Modal لتستخدم المتغيرات الجديدة
export function showConfirmModal(
    title,
    message,
    onConfirm,
    okText = "Confirm",
    type = "info"
) {
    const overlay = document.getElementById("customModal");
    if (!overlay) return;

    const box = overlay.querySelector(".modal-box");
    const titleEl = document.getElementById("modalTitle");
    const msgEl = document.getElementById("modalMessage");

    if (box) {
        box.className = "modal-box";
    }

    // 🔥 نحتاج العنصر الأب (الدائرة) والعنصر الابن (الرمز)
    const iconDiv = overlay.querySelector(".modal-icon");
    const iconInner = document.getElementById("modalIconClass");

    const okBtn = document.getElementById("modalOkBtn");
    let cancelBtn = document.getElementById("modalCancelBtn");

    if (!cancelBtn) {
        const actionsDiv = overlay.querySelector(".modal-actions");
        cancelBtn = document.createElement("button");
        cancelBtn.id = "modalCancelBtn";
        cancelBtn.className = "modal-cancel-btn";
        actionsDiv.insertBefore(cancelBtn, okBtn);
    }
    cancelBtn.style.display = "inline-block";
    cancelBtn.textContent = "Cancel";

    titleEl.textContent = title;
    msgEl.innerHTML = message;
    okBtn.textContent = okText;

    // استدعاء الضبط مع تمرير الـ iconDiv (للهالة) و iconInner (للرمز)
    configureModalType(box, iconDiv, iconInner, okBtn, type);

    overlay.classList.add("active");

    const cleanup = () => {
        okBtn.onclick = null;
        cancelBtn.onclick = null;
        cancelBtn.style.display = "none";
    };

    okBtn.onclick = () => {
        overlay.classList.remove("active");
        onConfirm();
        cleanup();
    };
    cancelBtn.onclick = () => {
        overlay.classList.remove("active");
        cleanup();
    };
}

// تحديث دالة Input Modal (للرفض)
export function showInputModal(title, placeholder, onSubmit, type = "danger") {
    const overlay = document.getElementById("customModal");
    const box = overlay.querySelector(".modal-box");
    const iconDiv = overlay.querySelector(".modal-icon");
    const iconInner = document.getElementById("modalIconClass");
    const msgEl = document.getElementById("modalMessage");
    const titleEl = document.getElementById("modalTitle");
    const okBtn = document.getElementById("modalOkBtn");
    let cancelBtn = document.getElementById("modalCancelBtn");

    if (!cancelBtn) {
        const actionsDiv = overlay.querySelector(".modal-actions");
        cancelBtn = document.createElement("button");
        cancelBtn.id = "modalCancelBtn";
        cancelBtn.className = "modal-cancel-btn";
        actionsDiv.insertBefore(cancelBtn, okBtn);
    }
    cancelBtn.style.display = "inline-block";
    cancelBtn.textContent = "Cancel";

    titleEl.textContent = title;
    okBtn.textContent = "Submit";

    configureModalType(box, iconDiv, iconInner, okBtn, type);
    // تغيير أيقونة الرفض لقلم (مع الحفاظ على الهالة الحمراء من الدالة السابقة)
    iconInner.className = "fa-solid fa-pen-to-square";

    msgEl.innerHTML = `<div class="input-wrap"><textarea  rows="5" id="modalInputArea" class="modal-textarea" placeholder="${placeholder}"></textarea></div>`;

    overlay.classList.add("active");

    setTimeout(() => {
        const input = document.getElementById("modalInputArea");
        if (input) input.focus();
    }, 100);

    const cleanup = () => {
        cancelBtn.style.display = "none";
        okBtn.onclick = null;
        cancelBtn.onclick = null;
        msgEl.innerHTML = "";
    };

    okBtn.onclick = () => {
        const val = document.getElementById("modalInputArea").value.trim();
        if (!val) return;
        overlay.classList.remove("active");
        onSubmit(val);
        cleanup();
    };

    cancelBtn.onclick = () => {
        overlay.classList.remove("active");
        cleanup();
    };
}
