import {
    initAuth,
    handleGoogleLogin,
    handleLogout,
    handleEmailSignUp,
    handleEmailSignIn,
    handlePasswordReset,
} from "./auth.js";
import {
    toggleDropdown,
    showError,
    clearError,
    setButtonLoading,
    toggleNotifications,
    showModal,
} from "./ui.js";
import {
    loadFlashcards,
    filterFlashcards,
    saveDownloadHistory,
    markAllUpdatesAsRead,
} from "./db.js"; // <--- استيراد جديد
// ✅ استبدل هذا الجزء في بداية main.js
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    increment,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"; // كان 10.8.0 وجعلناه 10.7.1 ليتطابق مع config.js
import { db } from "./config.js";

// ==========================================
// 🚀 Preloader Manager
// ==========================================
const Preloader = {
    progress: 0,
    bar: document.getElementById("loader-progress"),
    text: document.getElementById("loader-text"),
    container: document.getElementById("global-preloader"),

    update(percent, message) {
        if (!this.container) return; // حماية إذا لم يكن موجوداً

        this.progress = percent;
        if (this.bar) this.bar.style.width = `${this.progress}%`;
        if (this.text && message) this.text.textContent = message;

        // إذا وصل 100%، أخفي اللودر بعد نصف ثانية
        if (this.progress >= 100) {
            setTimeout(() => {
                this.container.classList.add("hidden");
            }, 500);
        }
    },
};

// أول ما السكريبت يشتغل، هنخليه 10%
Preloader.update(10, "Initializing...");
// تشغيل المراقب
initAuth();

document.addEventListener("DOMContentLoaded", () => {
    // ==========================================
    // 🔗 Deep Linking Logic (بداية الكود الجديد)
    // ==========================================
    const params = new URLSearchParams(window.location.search);
    const deepLinkId = params.get("deck");

    if (deepLinkId) {
        const hiddenInput = document.getElementById("deepLinkDeckId");
        if (hiddenInput) {
            // نضع الـ ID وننتظر ملف db.js ليقوم بالباقي
            hiddenInput.value = deepLinkId;
            console.log("🔗 Deep Link ID set:", deepLinkId);

            // تنظيف الرابط من المتصفح
            // window.history.replaceState({}, document.title, "/");
        }
    }

    // -------------------------------------------
    // 1. معالجة صفحة إنشاء الحساب (Sign Up)
    // -------------------------------------------
    const signupForm = document.getElementById("signupForm");
    if (signupForm) {
        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault(); // منع تحديث الصفحة
            clearError();

            // الزر الذي تم ضغطه (موجود داخل الفورم)
            const submitBtn = signupForm.querySelector('button[type="submit"]');
            // جلب البيانات من الحقول
            const name = signupForm.querySelector('input[name="name"]').value;
            const email = signupForm.querySelector('input[name="email"]').value;
            const password = signupForm.querySelector(
                'input[name="password"]',
            ).value;
            const confirmPassword = signupForm.querySelector(
                'input[name="confirm-password"]',
            ).value;

            const emailRegex =
                /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailRegex.test(email)) {
                showError(
                    "Please enter a valid email in English (e.g. name@domain.com).",
                );
                return;
            }

            // 2. تحقق من الاسم (يسمح بالعربي والإنجليزي، ولكن يمنع الأرقام والرموز)
            // ويشترط أن يكون الاسم 3 حروف على الأقل
            const nameRegex = /^[\u0600-\u06FFa-zA-Z\s]{3,30}$/;
            if (!nameRegex.test(name)) {
                showError(
                    "Please enter a real name (letters only, at least 3 chars).",
                );
                return;
            }

            // تحقق بسيط
            if (password !== confirmPassword) {
                showError("Passwords do not match.");
                return;
            }
            if (password.length < 8) {
                showError("The password must be at least 8 characters long.");
                return;
            }
            if (!document.getElementById("terms-conditions").checked) {
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
    const signinForm = document.getElementById("signinForm");
    if (signinForm) {
        signinForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const submitBtn = signinForm.querySelector('button[type="submit"]');
            const email = signinForm.querySelector('input[name="email"]').value;
            const password = signinForm.querySelector(
                'input[name="password"]',
            ).value;

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
            document.getElementById("resetMessage").style.display = "none";
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

                    resetForm.reset();
                } else {
                    msgBox.className = "reset-message reset-error";
                }
            });
        }
    }

    // -------------------------------------------
    // 3. أزرار جوجل والقوائم (الكود السابق)
    // -------------------------------------------
    const googleBtns = document.querySelectorAll(".google-btn");
    googleBtns.forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            handleGoogleLogin();
        });
    });

    const avatar = document.getElementById("userName");
    const arrow = document.querySelector(".dropdown-arrow i");
    if (avatar) {
        avatar.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleDropdown("userDropdown");

            if (arrow) {
                arrow.classList.toggle("fa-angle-down");
                arrow.classList.toggle("fa-angle-up");
            }
        });
    }

    const dropBtnMobile = document.getElementById("mobileUserName");
    const arrowMobile = document.querySelector("#mobileDropdownArrow i");

    if (dropBtnMobile) {
        dropBtnMobile.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleDropdown("mobileUserDropdown");
            if (arrowMobile) {
                arrowMobile.classList.toggle("fa-angle-down");
                arrowMobile.classList.toggle("fa-angle-up");
            }
        });
    }

    const decks = document.getElementById("decksDropbtn");
    if (decks) {
        decks.addEventListener("click", (e) => {
            e.stopPropagation();
            e.preventDefault();
            toggleDropdown("decksDrop");
        });
    }

    const noti = document.getElementById("notiDropbtn");
    if (noti) {
        noti.addEventListener("click", (e) => {
            e.stopPropagation();
            e.preventDefault();
            toggleDropdown("notiDrop");
        });
    }

    const tasks = document.getElementById("tasksDropbtn");
    if (tasks) {
        tasks.addEventListener("click", (e) => {
            e.stopPropagation();
            e.preventDefault();
            toggleDropdown("tasksDrop");
        });
    }

    // ربط زر الخروج

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", handleLogout);
    }

    // ربط زر الخروج الخاص بالموبايل
    const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");
    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener("click", handleLogout);
    }

    document.addEventListener("click", () => {
        const dropdown = document.getElementById("userDropdown");

        // ✅ التصحيح: التأكد من وجود القائمة أولاً
        if (dropdown) {
            dropdown.classList.remove("active");

            // التأكد من وجود السهم أيضاً قبل تعديله
            if (arrow) {
                if (!dropdown.classList.contains("active")) {
                    arrow.classList.add("fa-angle-down");
                    arrow.classList.remove("fa-angle-up");
                }
            }
        }
    });

    // --- 1. إشعارات الكمبيوتر ---
    const notifBtn = document.getElementById("notifBtn");
    if (notifBtn) {
        notifBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            // التصحيح: أضفنا 'notifBadge' كمتغير ثاني
            toggleNotifications("notifDropdown", "notifBadge");

            // إغلاق قائمة المستخدم إذا كانت مفتوحة
            const userDropdown = document.getElementById("userDropdown");
            if (userDropdown) userDropdown.classList.remove("active");
        });
    }

    // --- 2. إشعارات الموبايل ---
    const mobileNotifBtn = document.getElementById("mobileNotifBtn");
    if (mobileNotifBtn) {
        mobileNotifBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            // التصحيح: أضفنا 'mobileNotifBadge' كمتغير ثاني
            toggleNotifications("mobileNotifDropdown", "mobileNotifBadge");
        });
    }

    // --- Mobile custom menu handling ---
    const mobileMenuOpen = document.getElementById("mobileMenuOpen");
    const mobileMenu = document.querySelector(".mobile-menu");
    const mobileMenuClose = document.getElementById("mobileMenuClose");
    const themeToggleMobile = document.getElementById("themeToggleMobile");

    function openMobileMenu() {
        if (!mobileMenu) return;
        mobileMenu.classList.add("show");
        // prevent background scroll
        document.body.style.overflow = "hidden";
        // set focus for accessibility
        const closeBtn = document.getElementById("mobileMenuClose");
        if (closeBtn) closeBtn.focus();
    }
    function closeMobileMenu() {
        if (!mobileMenu) return;
        mobileMenu.classList.remove("show");
        document.body.style.overflow = "";
        // return focus to menu open button
        if (mobileMenuOpen) mobileMenuOpen.focus();
    }

    if (mobileMenuOpen) {
        mobileMenuOpen.addEventListener("click", (e) => {
            e.stopPropagation();
            openMobileMenu();
        });
    }
    if (mobileMenuClose)
        mobileMenuClose.addEventListener("click", () => closeMobileMenu());

    // close menu when clicking outside
    document.addEventListener("click", (e) => {
        if (!mobileMenu) return;
        if (!mobileMenu.classList.contains("show")) return;
        const targetInside = e.target.closest(".mobile-menu");
        const clickedOpen = e.target.closest("#mobileMenuOpen");
        if (!targetInside && !clickedOpen) closeMobileMenu();
    });

    // close on ESC
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeMobileMenu();
    });

    // mobile theme toggle: call global toggleTheme to avoid triggering clicks outside the menu
    if (themeToggleMobile) {
        themeToggleMobile.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation(); // keep the click inside the menu so it doesn't close
            if (window && typeof window.toggleTheme === "function") {
                window.toggleTheme();
            } else {
                // fallback to clicking main button if global function not available
                const mainThemeBtn = document.getElementById("themeToggle");
                if (mainThemeBtn) mainThemeBtn.click();
            }
        });

        // keyboard accessibility: Enter / Space
        themeToggleMobile.addEventListener("keydown", (e) => {
            if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                if (window && typeof window.toggleTheme === "function")
                    window.toggleTheme();
            }
        });
    }

    // close mobile menu when clicking a nav link inside it
    if (mobileMenu) {
        const links = mobileMenu.querySelectorAll("a");
        links.forEach((lnk) =>
            lnk.addEventListener("click", () => closeMobileMenu()),
        );
    }

    // إغلاق القوائم عند الضغط في أي مكان
    document.addEventListener("click", (e) => {
        // إغلاق قائمة المستخدم
        const userDropdown = document.getElementById("userDropdown");
        if (userDropdown) userDropdown.classList.remove("active");

        // إغلاق قائمة الإشعارات (إلا إذا ضغطنا داخلها)
        const notifDropdown = document.getElementById("notifDropdown");
        const notifBtn = document.getElementById("notifBtn");

        if (notifDropdown && notifBtn) {
            if (
                !notifDropdown.contains(e.target) &&
                !notifBtn.contains(e.target)
            ) {
                notifDropdown.classList.remove("active");
            }
        }

        // إغلاق قائمة إشعارات الموبايل (إلا إذا ضغطنا داخلها)
        const mobileNotifDropdown = document.getElementById(
            "mobileNotifDropdown",
        );
        const mobileNotifBtn = document.getElementById("mobileNotifBtn");
        if (mobileNotifDropdown && mobileNotifBtn) {
            if (
                !mobileNotifDropdown.contains(e.target) &&
                !mobileNotifBtn.contains(e.target)
            ) {
                mobileNotifDropdown.classList.remove("active");
            }
        }
    });

    // -------------------------------------------
    // 4. نظام البحث والفلترة (Search & Filters)
    // -------------------------------------------
    const searchInput = document.getElementById("searchInput");
    const categorySelect = document.getElementById("categorySelect");
    const yearSelect = document.getElementById("yearSelect");
    const resetBtn = document.getElementById("resetFiltersBtn");
    const moduleSelect = document.getElementById("filterModule"); // تأكد من الـ ID في HTML

    // متغير للتأخير (Debounce)
    let searchTimeout;

    function performFilter() {
        // نطلب إعادة التحميل من البداية (false)، والدالة في db.js ستكتشف وجود نص بحث وتتصرف
        import("./db.js").then(({ loadFlashcards }) => {
            loadFlashcards(false);
        });
    }

    // 1. البحث مع تأخير (Debounce) لتقليل القراءات من السيرفر
    if (searchInput) {
        searchInput.addEventListener("input", () => {
            const deepLinkInput = document.getElementById("deepLinkDeckId");
            if (deepLinkInput) {
                deepLinkInput.value = ""; // تنظيف الرابط فوراً
            }
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                performFilter();
            }, 600); // ينتظر 0.6 ثانية بعد التوقف عن الكتابة قبل البحث
        });
    }

    // 2. الفلاتر تعمل فوراً
    if (categorySelect)
        categorySelect.addEventListener("change", performFilter);
    if (yearSelect) yearSelect.addEventListener("change", performFilter);
    if (moduleSelect) moduleSelect.addEventListener("change", performFilter); // لو عندك فلتر للمواد

    // 3. زر إعادة التعيين
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            document.getElementById("deepLinkDeckId").value = "";
            searchInput.value = "";
            categorySelect.value = "all";
            yearSelect.value = "all";
            if (moduleSelect) moduleSelect.value = "all";
            performFilter();
        });
    }

    // -------------------------------------------
    // تفعيل زر Mark All As Read (الحل الجذري)
    // -------------------------------------------

    document.addEventListener("click", (e) => {
        // هل الشيء الذي ضغطت عليه (أو أبوه) يحمل كلاس mark-read؟
        if (e.target.matches(".mark-read") || e.target.closest(".mark-read")) {
            console.log("🖱️ تم الضغط على زر Mark All!"); // للتأكد أن الزر يعمل

            // استدعاء الدالة
            markAllUpdatesAsRead();

            // (اختياري) تأثير بصري بسيط لتشعر بالاستجابة
            const btn = e.target.closest(".mark-read");
            if (btn) btn.style.color = "#007bff";
        }
    });

    // -------------------------------------------
    // مراقبة التنزيلات (System Logic)
    // -------------------------------------------

    // استيراد دالة الحفظ

    // 1. مراقبة أزرار التنزيل في الكروت الرئيسية
    const grid = document.getElementById("flashcardsGrid");
    if (grid) {
        grid.addEventListener("click", (e) => {
            const btn = e.target.closest(".download-trigger");

            if (btn) {
                const deckId = btn.dataset.id;
                const version = btn.dataset.version;

                // أ) حفظ في الهستوري المحلي (للمستخدم)
                saveDownloadHistory(deckId, version);

                // ب) 🔥 جديد: زيادة العداد في السيرفر للإحصائيات 🔥
                // نستخدم import() ديناميكي لتجنب مشاكل التحميل
                import("./db.js").then(({ incrementDeckDownloads }) => {
                    incrementDeckDownloads(deckId);
                });
            }
        });
    }

    // 2. تعريف الدالة العامة لأزرار الإشعارات (التي كتبناها في HTML بـ onclick)
    window.handleUpdateClick = function (deckId, version) {
        // سواء ضغط تحميل أو mark as read، النتيجة واحدة:
        // نحفظ أنه يمتلك هذه النسخة الآن، فيختفي الإشعار
        saveDownloadHistory(deckId, version);
    };

    // --- Rating System Logic ---

    // تعريف المتغيرات
    const starsInput = document.querySelectorAll(".star-rating-input i");
    const ratingValueInput = document.getElementById("selectedRating");
    const commentInput = document.getElementById("reviewComment");
    const submitBtn = document.getElementById("submitReviewBtn");
    const ratingModal = document.getElementById("ratingModal");

    // دالة مساعدة لتلوين النجوم
    function fillStars(value) {
        starsInput.forEach((star) => {
            const starVal = star.getAttribute("data-value");
            if (starVal <= value) {
                star.classList.add("active");
                star.classList.replace("fa-regular", "fa-solid");
            } else {
                star.classList.remove("active");
                star.classList.replace("fa-solid", "fa-regular"); // تأكد من إرجاعها فارغة
            }
        });
    }

    // 1. فتح المودل (مطور)
    let currentRateDeckId = null;

    window.openRatingModal = async (deckId, deckTitle) => {
        currentRateDeckId = deckId;

        // أ) تحديث العنوان وإظهار المودل فوراً
        document.querySelector("#ratingModal h3").textContent =
            `Rate: ${deckTitle}`;
        ratingModal.style.display = "flex";
        ratingModal.style.opacity = "1";

        // ب) تصفير الحقول أولاً (مهم جداً عشان ما يظهر تقييم قديم)
        ratingValueInput.value = 0;
        commentInput.value = "";
        fillStars(0);
        if (submitBtn) submitBtn.innerText = "Loading..."; // مؤشر بسيط

        // ج) جلب التقييم السابق من قاعدة البيانات
        const { getUserReview } = await import("./db.js");
        const userReview = await getUserReview(deckId);

        // د) إذا وجدنا تقييم، نملأ البيانات
        if (userReview) {
            ratingValueInput.value = userReview.rating;
            commentInput.value = userReview.comment || "";
            fillStars(userReview.rating); // 🔥 هنا يحدث السحر: تلوين النجوم فوراً
            if (submitBtn) submitBtn.innerText = "Update Review";
        } else {
            if (submitBtn) submitBtn.innerText = "Submit Review";
        }
    };

    // 2. إغلاق المودل
    const closeRatingBtn = document.getElementById("closeRatingModal");
    if (closeRatingBtn) {
        closeRatingBtn.addEventListener("click", () => {
            ratingModal.style.display = "none";
        });
    }

    // 3. تفاعل النجوم (Hover & Click)
    const starsContainer = document.querySelector(".star-rating-input");

    starsInput.forEach((star) => {
        // عند المرور: لون مؤقتاً
        star.addEventListener("mouseover", function () {
            const val = this.getAttribute("data-value");
            fillStars(val);
        });

        // عند الضغط: ثبت القيمة
        star.addEventListener("click", function () {
            const val = this.getAttribute("data-value");
            ratingValueInput.value = val;
            fillStars(val);
        });
    });

    // عند الخروج: ارجع للقيمة المثبتة (سواء كانت 0 أو القيمة المحفوظة)
    if (starsContainer) {
        starsContainer.addEventListener("mouseleave", () => {
            const savedVal = ratingValueInput.value || 0;
            fillStars(savedVal);
        });
    }

    // 4. إرسال التقييم
    if (submitBtn) {
        submitBtn.addEventListener("click", async () => {
            const rating = parseInt(ratingValueInput.value);
            const comment = commentInput.value;
            const btn = submitBtn;

            if (rating === 0) {
                showModal(
                    "Rating Required ⭐",
                    "Please select a star rating before submitting.",
                    "error",
                );
                return;
            }

            const { submitDeckReview, loadFlashcards } =
                await import("./db.js");

            // UI Loading
            const originalText = btn.innerText;
            btn.innerText = "Sending...";
            btn.disabled = true;

            const success = await submitDeckReview(
                currentRateDeckId,
                rating,
                comment,
            );

            if (success) {
                ratingModal.style.display = "none";
                // alert("Thanks for your feedback! ⭐"); // اختياري

                // رسالة نجاح مخصصة حسب الحالة (جديد أو تعديل)
                const isUpdate = originalText.includes("Update");
                const msg = isUpdate
                    ? "Review Updated Successfully! 🔄"
                    : "Thanks for your feedback! ⭐";
                showModal("Success!", msg, "success");

                loadFlashcards();
            } else {
                showModal(
                    "Error",
                    "Error submitting review. Please try again.",
                    "error",
                );
            }

            btn.innerText = originalText; // أو Reset
            btn.disabled = false;
        });
    }
    // --- Report System Logic ---
    const reportModal = document.getElementById("reportModal");
    const closeReportBtn = document.getElementById("closeReportModal");
    const reportForm = document.getElementById("reportForm");

    // 1. فتح المودال
    window.openReportModal = (deckId, deckTitle) => {
        document.getElementById("reportDeckId").value = deckId;
        document.getElementById("reportDeckTitle").value = deckTitle;
        // تصفير الحقول
        document.getElementById("reportReason").value = "Broken Link";
        document.getElementById("reportDetails").value = "";

        if (reportModal) {
            reportModal.style.display = "flex";
            setTimeout(() => (reportModal.style.opacity = "1"), 10);
        }
    };

    // 2. إغلاق المودال
    if (closeReportBtn) {
        closeReportBtn.addEventListener("click", () => {
            if (reportModal) {
                reportModal.style.opacity = "0";
                setTimeout(() => (reportModal.style.display = "none"), 300);
            }
        });
    }

    // 3. إرسال البلاغ
    if (reportForm) {
        reportForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const btn = reportForm.querySelector('button[type="submit"]');
            const originalText = btn.innerText;
            btn.innerText = "Sending...";
            btn.disabled = true;

            const deckId = document.getElementById("reportDeckId").value;
            const deckTitle = document.getElementById("reportDeckTitle").value;
            const reason = document.getElementById("reportReason").value;
            const details = document.getElementById("reportDetails").value;

            // استيراد الدالة ديناميكياً
            const { submitReport } = await import("./db.js");
            const success = await submitReport(
                deckId,
                deckTitle,
                reason,
                details,
            );

            if (success) {
                reportModal.style.display = "none";
                showModal(
                    "Report Sent",
                    "Thanks for letting us know! We will check it soon.",
                    "success",
                );
            } else {
                showModal(
                    "Error",
                    "Could not send report. Try again.",
                    "error",
                );
            }

            btn.innerText = originalText;
            btn.disabled = false;
        });
    }
    // ==========================================
    // Smart Modal Closing Logic (ESC & Click Outside)
    // ==========================================
    const ratingModalElement = document.getElementById("ratingModal");
    const reportModalElement = document.getElementById("reportModal");

    // دالة موحدة لإغلاق المودال بشكل سلس
    function closeActiveModals() {
        if (ratingModalElement && ratingModalElement.style.display === "flex") {
            ratingModalElement.style.opacity = "0";
            setTimeout(() => (ratingModalElement.style.display = "none"), 300);
        }
        if (reportModalElement && reportModalElement.style.display === "flex") {
            reportModalElement.style.opacity = "0";
            setTimeout(() => (reportModalElement.style.display = "none"), 300);
        }
    }

    // 1. الإغلاق عن طريق النقر خارج صندوق المودال
    window.addEventListener("click", (e) => {
        if (
            e.target === ratingModalElement ||
            e.target === reportModalElement
        ) {
            closeActiveModals();
        }
    });

    // 2. الإغلاق عن طريق زر ESC في الكيبورد
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeActiveModals();
        }
    });

    // ==========================================
    // 🚀 Bottom Sheet & Markdown Logic
    // ==========================================
    const sheetOverlay = document.getElementById("detailsSheetOverlay");
    const bottomSheet = document.getElementById("detailsSheet");
    const closeSheetBtn = document.getElementById("closeSheetBtn");
    const sheetScrollable = document.getElementById("sheetScrollable");

    // دالة الفتح وتعبئة البيانات
    window.openCardDetails = function (deckId) {
        const deck = window.currentDecksData?.find((d) => d.id === deckId);
        if (!deck) return;

        document.getElementById("sheetImage").src =
            deck.imageUrl || "images/default_banner.webp";
        document.getElementById("sheetTitle").textContent = deck.title;
        document.getElementById("sheetYear").innerHTML =
            `<i class="fa-solid fa-calendar-days"></i> ${deck.year || "All"}`;
        document.getElementById("sheetCategory").innerHTML =
            `<i class="fa-solid fa-tag"></i> ${deck.category || "Theoretical"}`;
        document.getElementById("sheetCreator").innerHTML =
            `<i class="fa-solid fa-user-doctor"></i> ${deck.creator || "Unknown"}`;

        const dlBtn = document.getElementById("sheetDownloadBtn");
        dlBtn.href = deck.downloadUrl;
        dlBtn.setAttribute("data-id", deck.id);
        dlBtn.setAttribute("data-version", deck.version || "v1.0");

        const shareBtn = document.getElementById("sheetShareBtn");
        shareBtn.onclick = () => handleShare(deck.id, deck.title);

        const rawDescription =
            deck.description || "_No description provided for this deck._";
        document.getElementById("sheetMarkdown").innerHTML =
            marked.parse(rawDescription);

        sheetOverlay.classList.add("active");
        sheetScrollable.scrollTop = 0;

        // 🔥 السر هنا: إيقاف السكرول في الموقع بالكامل
        document.body.style.overflow = "hidden";
    };

    // دالة الإغلاق
    function closeSheet() {
        bottomSheet.style.transform = "";
        sheetOverlay.classList.remove("active");

        // 🔥 السر هنا: إعادة تشغيل السكرول للموقع بعد الإغلاق
        document.body.style.overflow = "";
    }

    // الإغلاق عند النقر على الـ X أو خارج الشيت
    if (closeSheetBtn) closeSheetBtn.addEventListener("click", closeSheet);
    if (sheetOverlay) {
        sheetOverlay.addEventListener("click", (e) => {
            if (e.target === sheetOverlay) closeSheet();
        });
    }

    // ------------------------------------------
    // 🔥 السحب الذكي للموبايل (Smart Swipe Logic)
    // ------------------------------------------
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    // لا نبدأ السحب إلا إذا كان السكرول الداخلي عند القمة (أو السحب تم من الهيدر)
    bottomSheet.addEventListener(
        "touchstart",
        (e) => {
            if (sheetScrollable.scrollTop <= 0) {
                startY = e.touches[0].clientY;
                isDragging = true;
                bottomSheet.style.transition = "none"; // نلغي النعومة أثناء سحب إصبع المستخدم لتكون الاستجابة فورية
            }
        },
        { passive: true },
    );

    bottomSheet.addEventListener(
        "touchmove",
        (e) => {
            if (!isDragging) return;
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;

            // لا نسمح بسحب الشيت لأعلى من حجمه الطبيعي، نسحب لأسفل فقط
            if (deltaY > 0) {
                bottomSheet.style.transform = `translateY(${deltaY}px)`;
            }
        },
        { passive: true },
    );

    bottomSheet.addEventListener("touchend", (e) => {
        if (!isDragging) return;
        isDragging = false;
        bottomSheet.style.transition =
            "transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1)"; // نرجع النعومة

        const deltaY = currentY - startY;

        // إذا سحب لأكثر من 150 بيكسل، نغلق الشيت
        if (deltaY > 150) {
            closeSheet();
        } else {
            // غير كدا نرجعه مكانه
            bottomSheet.style.transform = "translateY(0)";
        }
    });

    // ------------------------------------------
    // دالة المشاركة (Web Share API & Clipboard)
    // ------------------------------------------
    function handleShare(deckId, title) {
        const shareUrl = `${window.location.origin}${window.location.pathname}?deck=${deckId}`;

        // لو فاتح من موبايل وبيدعم المشاركة العادية (زي الواتساب وغيره)
        if (navigator.share) {
            navigator
                .share({
                    title: `ASU Anki: ${title}`,
                    text: `Check out this flashcard deck: ${title}`,
                    url: shareUrl,
                })
                .catch(console.error);
        } else {
            // لو فاتح من كمبيوتر (نسخ للـ Clipboard)
            navigator.clipboard
                .writeText(shareUrl)
                .then(() => {
                    const shareBtn = document.getElementById("sheetShareBtn");

                    // حفظ المحتوى الأصلي للزر
                    const originalHtml = shareBtn.innerHTML;

                    // تغيير شكل الزر (علامة صح ولون أخضر)
                    shareBtn.innerHTML = `Copied <i class="fa-solid fa-check"></i>`;
                    shareBtn.style.color = "#33d9b2"; // أخضر مريح
                    shareBtn.style.borderColor = "#33d9b2";

                    // إرجاع الزر لحالته الأصلية بعد 1.5 ثانية
                    setTimeout(() => {
                        shareBtn.innerHTML = originalHtml;
                        shareBtn.style.color = "";
                        shareBtn.style.borderColor = "";
                    }, 1500);
                })
                .catch((err) => {
                    console.error("Failed to copy!", err);
                });
        }
    }
});

window.markGeneralAsRead = function (notifId) {
    import("./db.js").then((module) => {
        module.markGeneralAsRead(notifId);
    });
};

const loadMoreBtn = document.getElementById("loadMoreBtn");
if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
        // نرسل true لأننا نريد تحميل المزيد
        loadFlashcards(true);
    });
}
// ==========================================
// 📊 Simple Daily Visitor Tracker
// ==========================================

async function trackDailyVisit() {
    // 1. Check if user already visited in this session
    const today = new Date().toLocaleDateString("en-CA", {
        timeZone: "Africa/Cairo",
    });
    const storageKey = `visited_${today}`;

    if (sessionStorage.getItem(storageKey)) {
        return; // User already counted today
    }

    // 2. Increment the counter in Firebase
    try {
        const statsRef = doc(db, "analytics", "daily_visits");
        const docSnap = await getDoc(statsRef);

        if (docSnap.exists()) {
            await updateDoc(statsRef, {
                [today]: increment(1),
            });
        } else {
            await setDoc(statsRef, {
                [today]: 1,
            });
        }

        // 3. Mark session as visited
        sessionStorage.setItem(storageKey, "true");
        console.log(`✅ New visitor counted for: ${today}`);
    } catch (error) {
        console.error("Tracker Error:", error);
    }
}

// Run automatically
document.addEventListener("DOMContentLoaded", trackDailyVisit);
