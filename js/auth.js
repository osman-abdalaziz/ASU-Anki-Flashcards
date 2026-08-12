import {
    signInWithRedirect,
    signOut,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    sendPasswordResetEmail,
    sendEmailVerification,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 🔥 1. إضافة استيراد دوال Firestore
import {
    doc,
    setDoc,
    getDoc,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔥 2. إضافة استيراد db
import { auth, provider, db } from "./config.js";
import { updateNavbarUI, showError, showModal } from "./ui.js";
import { loadFlashcards } from "./db.js";

// =============================
// 🔥 دالة مساعدة جديدة لحفظ المستخدم (بدون التأثير على باقي الكود)
// =============================
async function saveUserToFirestore(user) {
    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        // إذا لم يكن الملف موجوداً (مستخدم جديد)
        if (!userSnap.exists()) {
            await setDoc(userRef, {
                uid: user.uid,
                name: user.displayName || "User",
                email: user.email,
                role: "student", // الرتبة الافتراضية
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
            });
            console.log("✅ User document created in Firestore");
        } else {
            // تحديث وقت آخر ظهور فقط
            await setDoc(
                userRef,
                { lastLogin: serverTimestamp() },
                { merge: true },
            );
        }
    } catch (error) {
        console.error("Error saving user to DB:", error);
    }
}

// =============================
// 1. الدخول عبر جوجل
// =============================
export async function handleGoogleLogin() {
    try {
        const result = await signInWithRedirect(auth, provider); // تم تعديلها لاستلام النتيجة
        const user = result.user;

        // 🔥 حفظ المستخدم في الداتابيز
        await saveUserToFirestore(user);

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
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password,
        );
        const user = userCredential.user;

        // 2. تحديث اسم المستخدم
        await updateProfile(user, {
            displayName: name,
        });

        // 🔥 حفظ بيانات المستخدم الجديد فوراً في Firestore 🔥
        await setDoc(doc(db, "users", user.uid), {
            uid: user.uid,
            name: name,
            email: email,
            role: "student",
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
        });

        // 3. إرسال رابط التفعيل
        await sendEmailVerification(user);

        // 3. (خطوتك الأصلية) إجبار المتصفح على تحديث بيانات المستخدم
        await user.reload();

        await signOut(auth);

        await showModal(
            "Account Created Successfully! 🎉",
            "We have sent a verification link to your email. Please check your inbox or (Spam), activate your account, and then sign in.",
            "success",
            "Done",
            () => {
                window.location.href = "signin";
            },
        );

        console.log("Account Created:", user.email);
        return true;
    } catch (error) {
        console.error("SignUp Error:", error.code);
        if (error.code === "auth/email-already-in-use") {
            showError("This email is already registered.");
        } else if (error.code === "auth/weak-password") {
            showError("The password must be at least 8 characters long.");
        } else if (error.code === "auth/invalid-email") {
            showError("The email address is not valid.");
        } else {
            showError("Error:" + error.message);
        }
        return false;
    }
}

let isLoggingIn = false;

// =============================
// 3. تسجيل الدخول (الإيميل)
// =============================
export async function handleEmailSignIn(email, password) {
    try {
        isLoggingIn = true;
        const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password,
        );
        const user = userCredential.user;

        if (!user.emailVerified) {
            const messageHTML = `
                Please check your inbox or (Spam) to activate your account.<br>
                <span style="font-size: 0.85rem; color: var(--text-secondary-color);">
                    Didn't receive it? 
                    <a href="#" onclick="window.resendVerificationEmail(event)" 
                       style="color: var(--main-color); text-decoration: underline; font-weight: 500;">
                       Resend Link
                    </a>
                </span>
            `;

            await showModal(
                "Verification Required 🔒",
                messageHTML,
                "error",
                "Close",
                async () => {
                    await signOut(auth);
                    isLoggingIn = false;
                },
            );

            return false;
        }

        // 🔥 تحديث وقت الدخول في الداتابيز عند تسجيل الدخول الناجح
        await saveUserToFirestore(user);

        console.log("Logged In Successfully");
        redirectIfSuccess();
        return true;
    } catch (error) {
        isLoggingIn = false;
        console.error("SignIn Error:", error.code);
        if (
            error.code === "auth/invalid-credential" ||
            error.code === "auth/user-not-found" ||
            error.code === "auth/wrong-password"
        ) {
            showError(" Invalid email or password.");
        } else if (error.code === "auth/too-many-requests") {
            showError(
                "Too many failed login attempts. Please try again later.",
            );
        } else if (error.code === "auth/invalid-email") {
            showError("The email address is not valid.");
        } else if (error.code === "auth/missing-password") {
            showError("The password is missing.");
        } else {
            showError("Failed to sign in: " + error.message);
        }
        return false;
    }
}

// دالة إرسال رابط استعادة كلمة المرور (كما هي)
export async function handlePasswordReset(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        return {
            success: true,
            message: `Check your spam folder if you didn't receive the email! Link Sent Successfully`,
        };
    } catch (error) {
        console.error("Reset Error:", error.code);
        if (error.code === "auth/user-not-found") {
            return {
                success: false,
                message: "No user found with this email.",
            };
        } else if (error.code === "auth/invalid-email") {
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
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            if (!user.emailVerified) {
                if (isLoggingIn) return;
                signOut(auth);
                return;
            }

            // 🔥 1. جلب بيانات المستخدم لمعرفة الرتبة (Role)
            let userData = null;
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    userData = userDoc.data();
                }
            } catch (error) {
                console.error("Error fetching user role:", error);
            }

            // 🔥 2. تحديث الواجهة مع تمرير بيانات المستخدم
            updateNavbarUI(user, userData);

            saveUserToFirestore(user);
            loadFlashcards();

            const path = window.location.pathname;
            if (path.includes("signin") || path.includes("signup")) {
                if (!isLoggingIn) window.location.replace("index.html");
            }
        } else {
            // حالة الخروج
            updateNavbarUI(null, null);

            // قفل المحتوى
            const grid = document.getElementById("page-content");
            if (grid) {
                grid.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 60px; width: 100%; height: 100%; display:flex; justify-content:center; flex-direction:column; align-items:center;">
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

function redirectIfSuccess() {
    if (
        window.location.pathname.includes("signin") ||
        window.location.pathname.includes("signup")
    ) {
        window.location.href = "index";
    }
}

// =============================
// 5. وظيفة إعادة إرسال التفعيل 📧
// =============================
window.resendVerificationEmail = async function (event) {
    if (event) event.preventDefault();

    const user = auth.currentUser;
    if (user) {
        try {
            const link = event.target;
            const originalText = link.innerText;
            link.innerText = "Sending...";
            link.style.pointerEvents = "none";

            await sendEmailVerification(user);

            link.innerText = "✅ Sent Successfully!";
            link.style.color = "#2ecc71";
        } catch (error) {
            console.error("Resend Error:", error);
            alert("Error: " + error.message);
            event.target.innerText = "Try Again";
            event.target.style.pointerEvents = "auto";
        }
    }
};
