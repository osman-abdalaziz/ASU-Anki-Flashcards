import {
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword, // دالة إنشاء الحساب
    signInWithEmailAndPassword,     // دالة تسجيل الدخول
    updateProfile,// دالة تحديث الاسم
    sendPasswordResetEmail // دالة استعادة كلمة المرور

} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { auth, provider } from "./config.js";
import { updateNavbarUI, showError } from "./ui.js";
import { loadFlashcards } from "./db.js"; // <--- جديد


// =============================
// 1. الدخول عبر جوجل (موجود سابقاً)
// =============================
export async function handleGoogleLogin() {
    try {
        await signInWithPopup(auth, provider);
        redirectIfSuccess();
    } catch (error) {
        console.error("Google Login Error:", error);
        showError("Failed to sign in with Google.");
    }
}

// =============================
// 2. إنشاء حساب جديد (الإيميل)
// =============================
export async function handleEmailSignUp(name, email, password) {
    try {
        // 1. إنشاء الحساب
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. تحديث اسم المستخدم
        await updateProfile(user, {
            displayName: name
        });

        // 3. (الخطوة الجديدة) إجبار المتصفح على تحديث بيانات المستخدم فوراً لضمان حفظ الاسم
        await user.reload();

        console.log("Account Created:", user.email);

        // 4. التوجيه
        redirectIfSuccess();
        return true;

    } catch (error) {
        console.error("SignUp Error:", error.code);
        if (error.code === 'auth/email-already-in-use') {
            showError("This email is already registered.");
        } else if (error.code === 'auth/weak-password') {
            showError("The password must be at least 6 characters long.");
        } else if (error.code === 'auth/invalid-email') {
            showError("The email address is not valid.");
        } else {
            showError("Error:" + error.message);
        }
        return false;
    }
}

// =============================
// 3. تسجيل الدخول (الإيميل)
// =============================
export async function handleEmailSignIn(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        console.log("Logged In Successfully");
        redirectIfSuccess();
        return true;
    } catch (error) {
        console.error("SignIn Error:", error.code);
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            showError(" Invalid email or password.");
        } else if (error.code === 'auth/too-many-requests') {
            showError("Too many failed login attempts. Please try again later.");
        } else if (error.code === 'auth/invalid-email') {
            showError("The email address is not valid.");
        } else {
            showError("Failed to sign in: " + error.message);
        }
        return false;
    }
}

// دالة إرسال رابط استعادة كلمة المرور
export async function handlePasswordReset(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true, message: `Check your spam folder if you didn't receive the email! Link Sent Successfully` };
    } catch (error) {
        console.error("Reset Error:", error.code);
        if (error.code === 'auth/user-not-found') {
            return { success: false, message: "No user found with this email." };
        } else if (error.code === 'auth/invalid-email') {
            return { success: false, message: "Invalid email format." };
        } else {
            return { success: false, message: "Error: " + error.message };
        }
    }
}

// =============================
// 4. الخروج والمراقبة
// =============================
export async function handleLogout() {
    try {
        await signOut(auth);
        window.location.reload();
    } catch (error) {
        console.error("Logout Error:", error);
    }
}

export function initAuth() {
    onAuthStateChanged(auth, (user) => {
        updateNavbarUI(user);

        // 2. الحماية: إعادة التوجيه إذا كان مسجل الدخول ويحاول دخول صفحات التسجيل
        if (user) {
            loadFlashcards(); // <--- جديد: تحميل الكروت بعد تسجيل الدخول
            const path = window.location.pathname; // معرفة اسم الصفحة الحالية

            // هل نحن في صفحة signin.html أو signup.html؟
            if (path.includes('signin.html') || path.includes('signup.html')) {
                console.log("المستخدم مسجل دخول بالفعل، جاري التحويل للرئيسية...");
                window.location.replace('index.html'); // استخدام replace أفضل لأنه لا يحفظ صفحة الدخول في التاريخ (History)
            }
        } else {
            // ❌ المستخدم زائر
            // يمكنك هنا إفراغ الشبكة أو إظهار رسالة "يجب التسجيل"
            const grid = document.getElementById('flashcardsGrid');
            if (grid) {
                grid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 60px;">
                        <i class="fa-solid fa-lock" style="font-size: 4rem; color: var(--text-color); margin-bottom: 20px;"></i>
                        <h2 style="color: var(--text-color)">Content Locked</h2>
                        <p style="color: var(--text-secondary-color); margin-bottom: 30px;">You must be signed in to access the flashcards library.</p>
                        <a href="signin.html" class="main-btn" style="padding: 8px 25px;">Sign In <i class="fa-solid fa-user fa-fw"aria-hidden="true"></i></a>
                    </div>
                `;
            }
        }
    });
}

// دالة مساعدة للتوجيه بعد النجاح
function redirectIfSuccess() {
    // إذا كان المستخدم في صفحة الدخول أو التسجيل، نرجعه للصفحة الرئيسية
    if (window.location.pathname.includes('signin.html') || window.location.pathname.includes('signup.html')) {
        window.location.href = 'index.html';
    }
}