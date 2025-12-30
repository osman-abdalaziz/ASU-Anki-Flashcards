import { initAuth, handleGoogleLogin, handleLogout, handleEmailSignUp, handleEmailSignIn, handlePasswordReset } from "./auth.js";
import { toggleDropdown, showError, clearError, setButtonLoading, toggleNotifications } from "./ui.js";
import { loadFlashcards, filterFlashcards, saveDownloadHistory, markAllUpdatesAsRead } from "./db.js"; // <--- استيراد جديد

// تشغيل المراقب
initAuth();


document.addEventListener('DOMContentLoaded', () => {


    // -------------------------------------------
    // 1. معالجة صفحة إنشاء الحساب (Sign Up)
    // -------------------------------------------
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // منع تحديث الصفحة
            clearError();

            // الزر الذي تم ضغطه (موجود داخل الفورم)
            const submitBtn = signupForm.querySelector('button[type="submit"]');
            // جلب البيانات من الحقول
            const name = signupForm.querySelector('input[name="name"]').value;
            const email = signupForm.querySelector('input[name="email"]').value;
            const password = signupForm.querySelector('input[name="password"]').value;
            const confirmPassword = signupForm.querySelector('input[name="confirm-password"]').value;

            // تحقق بسيط
            if (password !== confirmPassword) {
                showError("Passwords do not match.");
                return;
            }
            if (password.length < 6) {
                showError("The password must be at least 6 characters long.");
                return;
            }
            if (!document.getElementById('terms-conditions').checked) {
                showError("You must agree to the Terms & Conditions.");
                return;
            }

            setButtonLoading(submitBtn, true);

            // استدعاء دالة التسجيل وانتظار النتيجة
            const isSuccess = await handleEmailSignUp(name, email, password);

            // إذا فشلت العملية، نوقف الانميشن (لو نجحت، الصفحة ستتغير فلا داعي للإيقاف)
            if (!isSuccess) {
                setButtonLoading(submitBtn, false);
            }
        });
    }

    // -------------------------------------------
    // 2. معالجة صفحة تسجيل الدخول (Sign In)
    // -------------------------------------------
    const signinForm = document.getElementById('signinForm');
    if (signinForm) {
        signinForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = signinForm.querySelector('button[type="submit"]');
            const email = signinForm.querySelector('input[name="email"]').value;
            const password = signinForm.querySelector('input[name="password"]').value;

            setButtonLoading(submitBtn, true);

            const isSuccess = await handleEmailSignIn(email, password);

            if (!isSuccess) {
                setButtonLoading(submitBtn, false);
            }
        });
    }

    // --- كود المودال (Forgot Password) ---
    const modal = document.getElementById("forgotModal");
    const openModalBtn = document.querySelector(".forgot"); // الكلاس الموجود في زر Forget Password
    const closeModalBtn = document.querySelector(".close-modal");
    const resetForm = document.getElementById("resetForm");

    if (openModalBtn && modal) {
        // فتح المودال
        openModalBtn.addEventListener("click", (e) => {
            e.preventDefault();
            modal.style.display = "block";
        });

        // إغلاق المودال من زر X
        closeModalBtn.addEventListener("click", () => {
            modal.style.display = "none";
        });

        // إغلاق المودال عند الضغط خارجه
        window.addEventListener("click", (e) => {
            if (e.target === modal) {
                modal.style.display = "none";
            }
        });

        // إرسال طلب الريسيت
        if (resetForm) {
            resetForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const email = document.getElementById("resetEmail").value;
                const msgBox = document.getElementById("resetMessage");
                const btn = resetForm.querySelector("button");

                // تشغيل اللودينج
                setButtonLoading(btn, true);

                const result = await handlePasswordReset(email);

                // إيقاف اللودينج
                setButtonLoading(btn, false);

                // عرض النتيجة
                msgBox.style.display = "block";
                msgBox.textContent = result.message;

                if (result.success) {
                    msgBox.className = "reset-message reset-success";
                    // مسح الحقل بعد ثواني وإغلاق المودال
                    setTimeout(() => {
                        modal.style.display = "none";
                        msgBox.style.display = "none";
                        resetForm.reset();
                    }, 3000);
                } else {
                    msgBox.className = "reset-message reset-error";
                }
            });
        }
    }

    // -------------------------------------------
    // 3. أزرار جوجل والقوائم (الكود السابق)
    // -------------------------------------------
    const googleBtns = document.querySelectorAll('.google-btn');
    googleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            handleGoogleLogin();
        });
    });

    const avatar = document.getElementById('userName');
    const arrow = document.querySelector('.dropdown-arrow i');
    if (avatar) {
        avatar.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown("userDropdown");

            if (arrow) {
                arrow.classList.toggle('fa-angle-down');
                arrow.classList.toggle('fa-angle-up');
            }
        });
    }

    const dropBtnMobile = document.getElementById('mobileUserName');
    const arrowMobile = document.querySelector('#mobileDropdownArrow i');

    if (dropBtnMobile) {
        dropBtnMobile.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown("mobileUserDropdown");
            if (arrowMobile) {
                arrowMobile.classList.toggle('fa-angle-down');
                arrowMobile.classList.toggle('fa-angle-up');
            }
        });
    }

    // ربط زر الخروج

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // ربط زر الخروج الخاص بالموبايل
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', handleLogout);
    }

    document.addEventListener('click', () => {
        const dropdown = document.getElementById('userDropdown');
        if (dropdown) dropdown.classList.remove('active');
        if (!dropdown.classList.contains('active')) {
            arrow.classList.add('fa-angle-down');
            arrow.classList.remove('fa-angle-up');
        }
    });


    // --- 1. إشعارات الكمبيوتر ---
    const notifBtn = document.getElementById('notifBtn');
    if (notifBtn) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // التصحيح: أضفنا 'notifBadge' كمتغير ثاني
            toggleNotifications('notifDropdown', 'notifBadge');

            // إغلاق قائمة المستخدم إذا كانت مفتوحة
            const userDropdown = document.getElementById('userDropdown');
            if (userDropdown) userDropdown.classList.remove('active');
        });
    }

    // --- 2. إشعارات الموبايل ---
    const mobileNotifBtn = document.getElementById('mobileNotifBtn');
    if (mobileNotifBtn) {
        mobileNotifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // التصحيح: أضفنا 'mobileNotifBadge' كمتغير ثاني
            toggleNotifications('mobileNotifDropdown', 'mobileNotifBadge');
        });
    }

    // --- Mobile custom menu handling ---
    const mobileMenuOpen = document.getElementById('mobileMenuOpen');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileMenuClose = document.getElementById('mobileMenuClose');
    const themeToggleMobile = document.getElementById('themeToggleMobile');

    function openMobileMenu() {
        if (!mobileMenu) return;
        mobileMenu.classList.add('show');
        // prevent background scroll
        document.body.style.overflow = 'hidden';
        // set focus for accessibility
        const closeBtn = document.getElementById('mobileMenuClose');
        if (closeBtn) closeBtn.focus();
    }
    function closeMobileMenu() {
        if (!mobileMenu) return;
        mobileMenu.classList.remove('show');
        document.body.style.overflow = '';
        // return focus to menu open button
        if (mobileMenuOpen) mobileMenuOpen.focus();
    }

    if (mobileMenuOpen) {
        mobileMenuOpen.addEventListener('click', (e) => {
            e.stopPropagation();
            openMobileMenu();
        });
    }
    if (mobileMenuClose) mobileMenuClose.addEventListener('click', () => closeMobileMenu());

    // close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!mobileMenu) return;
        if (!mobileMenu.classList.contains('show')) return;
        const targetInside = e.target.closest('.mobile-menu');
        const clickedOpen = e.target.closest('#mobileMenuOpen');
        if (!targetInside && !clickedOpen) closeMobileMenu();
    });

    // close on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMobileMenu();
    });

    // mobile theme toggle: call global toggleTheme to avoid triggering clicks outside the menu
    if (themeToggleMobile) {
        themeToggleMobile.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // keep the click inside the menu so it doesn't close
            if (window && typeof window.toggleTheme === 'function') {
                window.toggleTheme();
            } else {
                // fallback to clicking main button if global function not available
                const mainThemeBtn = document.getElementById('themeToggle');
                if (mainThemeBtn) mainThemeBtn.click();
            }
        });

        // keyboard accessibility: Enter / Space
        themeToggleMobile.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                if (window && typeof window.toggleTheme === 'function') window.toggleTheme();
            }
        });
    }

    // close mobile menu when clicking a nav link inside it
    if (mobileMenu) {
        const links = mobileMenu.querySelectorAll('a');
        links.forEach((lnk) => lnk.addEventListener('click', () => closeMobileMenu()));
    }

    // إغلاق القوائم عند الضغط في أي مكان
    document.addEventListener('click', (e) => {
        // إغلاق قائمة المستخدم
        const userDropdown = document.getElementById('userDropdown');
        if (userDropdown) userDropdown.classList.remove('active');

        // إغلاق قائمة الإشعارات (إلا إذا ضغطنا داخلها)
        const notifDropdown = document.getElementById('notifDropdown');
        const notifBtn = document.getElementById('notifBtn');

        if (notifDropdown && notifBtn) {
            if (!notifDropdown.contains(e.target) && !notifBtn.contains(e.target)) {
                notifDropdown.classList.remove('active');
            }
        }

        // إغلاق قائمة إشعارات الموبايل (إلا إذا ضغطنا داخلها)
        const mobileNotifDropdown = document.getElementById('mobileNotifDropdown');
        const mobileNotifBtn = document.getElementById('mobileNotifBtn');
        if (mobileNotifDropdown && mobileNotifBtn) {
            if (!mobileNotifDropdown.contains(e.target) && !mobileNotifBtn.contains(e.target)) {
                mobileNotifDropdown.classList.remove('active');
            }
        }
    });

    // -------------------------------------------
    // 4. نظام البحث والفلترة (Search & Filters)
    // -------------------------------------------
    const searchInput = document.getElementById('searchInput');
    const categorySelect = document.getElementById('categorySelect');
    const yearSelect = document.getElementById('yearSelect');
    const resetBtn = document.getElementById('resetFiltersBtn');

    // دالة تجمع القيم الحالية وترسلها للفلترة
    function performFilter() {
        const text = searchInput.value;
        const cat = categorySelect.value; // 'all', 'theoretical', 'practical'
        const yr = yearSelect.value;      // 'all', '1st Year', ...

        filterFlashcards(text, cat, yr);
    }

    // الاستماع للأحداث (Live Search)
    if (searchInput) {
        searchInput.addEventListener('input', performFilter); // يعمل عند كل حرف يُكتب
    }
    if (categorySelect) {
        categorySelect.addEventListener('change', performFilter);
    }
    if (yearSelect) {
        yearSelect.addEventListener('change', performFilter);
    }

    // زر إعادة التعيين (Reset)
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            // 1. تصفير الحقول في الواجهة
            searchInput.value = '';
            categorySelect.value = 'all';
            yearSelect.value = 'all';

            // 2. تطبيق الفلتر (سيعيد كل شيء لأن القيم أصبحت 'all')
            performFilter();
        });
    }

    // -------------------------------------------
    // تفعيل زر Mark All As Read (الحل الجذري)
    // -------------------------------------------

    document.addEventListener('click', (e) => {
        // هل الشيء الذي ضغطت عليه (أو أبوه) يحمل كلاس mark-read؟
        if (e.target.matches('.mark-read') || e.target.closest('.mark-read')) {

            console.log("🖱️ تم الضغط على زر Mark All!"); // للتأكد أن الزر يعمل

            // استدعاء الدالة
            markAllUpdatesAsRead();

            // (اختياري) تأثير بصري بسيط لتشعر بالاستجابة
            const btn = e.target.closest('.mark-read');
            if (btn) btn.style.color = '#007bff';
        }
    });

    // -------------------------------------------
    // مراقبة التنزيلات (System Logic)
    // -------------------------------------------

    // استيراد دالة الحفظ


    // 1. مراقبة أزرار التنزيل في الكروت الرئيسية
    const grid = document.getElementById('flashcardsGrid');
    if (grid) {
        grid.addEventListener('click', (e) => {
            // البحث عن الزر المضغوط
            const btn = e.target.closest('.download-trigger');

            if (btn) {
                const deckId = btn.dataset.id;
                const version = btn.dataset.version;

                // حفظ العملية في الهستوري
                console.log(`User downloaded: ${deckId} (${version})`);
                saveDownloadHistory(deckId, version);
            }
        });
    }

    // 2. تعريف الدالة العامة لأزرار الإشعارات (التي كتبناها في HTML بـ onclick)
    window.handleUpdateClick = function (deckId, version) {
        // سواء ضغط تحميل أو mark as read، النتيجة واحدة:
        // نحفظ أنه يمتلك هذه النسخة الآن، فيختفي الإشعار
        saveDownloadHistory(deckId, version);
    };
});

window.markGeneralAsRead = function (notifId) {
    import('./db.js').then(module => {
        module.markGeneralAsRead(notifId);
    });
};

