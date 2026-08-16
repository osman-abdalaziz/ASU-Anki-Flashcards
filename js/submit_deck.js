import { db, auth } from "./config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    serverTimestamp,
    doc,
    getDoc,
    setDoc,
    updateDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showModal } from "./ui.js";
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ==========================================
// 🚀 إعداد محرر الـ Markdown (EasyMDE)
// ==========================================
let easyMDE = null;

document.addEventListener("DOMContentLoaded", () => {
    const descElement = document.getElementById("deckDesc");
    if (descElement) {
        easyMDE = new EasyMDE({
            element: descElement,
            spellChecker: false, // تعطيل المصحح اللغوي لأنه مزعج أحياناً
            placeholder: "What does this deck cover? (Markdown supported)",
            status: false, // إخفاء الشريط السفلي
            toolbar: [
                "bold",
                "italic",
                "heading",
                "|",
                "quote",
                "unordered-list",
                "ordered-list",
                "|",
                "link",
                "preview",
                "guide",
            ],
        });
    }
});

const storage = getStorage();

// ==========================================
// 1. Authentication Guard
// ==========================================
let currentCreatorName = "Creator";

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const role = userSnap.data().role || "student";
                if (
                    role === "maker" ||
                    role === "admin" ||
                    user.email === "osmanabdalaziz2005@gmail.com"
                ) {
                    currentCreatorName =
                        userSnap.data().name || user.displayName || "Creator";
                    const nameEl = document.getElementById("mobileUserName");
                    if (nameEl) nameEl.innerText = currentCreatorName;
                    const avatarEl =
                        document.getElementById("mobileUserAvatar");
                    if (avatarEl)
                        avatarEl.src = user.photoURL || "../images/user.webp";
                } else {
                    window.location.href = "../index.html";
                }
            }
        } catch (error) {
            console.error("Auth Guard Error:", error);
        }
    } else {
        window.location.href = "../index.html";
    }
});

function getDirectDriveLink(url) {
    let fileId = null;
    const regex1 = /\/d\/([a-zA-Z0-9_-]+)/;
    const regex2 = /id=([a-zA-Z0-9_-]+)/;
    if (url.match(regex1)) fileId = url.match(regex1)[1];
    else if (url.match(regex2)) fileId = url.match(regex2)[1];
    if (fileId)
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
    return null;
}

// ==========================================
// 2. Native Vanilla Canvas Hybrid Engine
// ==========================================
const canvas = document.getElementById("bannerCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;

if (canvas) {
    canvas.width = 1920;
    canvas.height = 1080;
    canvas.style.cursor = "grab";
}

const brandColors = [
    "#E53935",
    "#D81B60",
    "#8E24AA",
    "#5E35B1",
    "#3949AB",
    "#1E88E5",
    "#039BE5",
    "#00ACC1",
    "#00897B",
    "#43A047",
    "#7CB342",
    "#fbc02d",
    "#FB8C00",
    "#F4511E",
    "#6D4C41",
];

const availableIcons = [
    { id: "icon-book", preview: "../images/icons/book.png" },
    { id: "icon-bacteria", preview: "../images/icons/bacteria.png" },
    { id: "icon-blood", preview: "../images/icons/blood.png" },
    { id: "icon-brain", preview: "../images/icons/brain.png" },
    { id: "icon-child", preview: "../images/icons/child.png" },
    { id: "icon-dna", preview: "../images/icons/dna.png" },
    { id: "icon-eye", preview: "../images/icons/eye.png" },
    { id: "icon-flask", preview: "../images/icons/flask.png" },
    { id: "icon-heart", preview: "../images/icons/heart.png" },
    { id: "icon-immune", preview: "../images/icons/immune.png" },
    { id: "icon-kidney", preview: "../images/icons/kidney.png" },
    { id: "icon-lungs", preview: "../images/icons/lungs.png" },
    { id: "icon-medicine", preview: "../images/icons/medicine.png" },
    { id: "icon-microscope", preview: "../images/icons/microscope.png" },
    { id: "icon-muscle", preview: "../images/icons/muscle.png" },
    { id: "icon-nerve", preview: "../images/icons/nerve.png" },
    { id: "icon-skull", preview: "../images/icons/skull.png" },
    { id: "icon-stomach", preview: "../images/icons/stomach.png" },
    { id: "icon-thyroid", preview: "../images/icons/thyroid.png" },
    { id: "icon-virus", preview: "../images/icons/virus.png" },
    { id: "icon-scalpel", preview: "../images/icons/scalpel.png" },
    { id: "icon-uterus", preview: "../images/icons/uterus.png" },
];
const availablePatterns = [
    { id: "pattern-1", preview: "../images/templates/template (1).png" },
    { id: "pattern-2", preview: "../images/templates/template (2).png" },
    { id: "pattern-3", preview: "../images/templates/template (3).png" },
    { id: "pattern-4", preview: "../images/templates/template (4).png" },
    { id: "pattern-5", preview: "../images/templates/template (5).png" },
    { id: "pattern-6", preview: "../images/templates/template (6).png" },
    // إضافة الـ patterns الإضافية هنا لاحقاً
];

let selectedColor = brandColors[5];
let selectedIconPath = availableIcons[0]?.preview;
let selectedPatternPath = availablePatterns[0]?.preview;

const overlayImg = new Image();
overlayImg.crossOrigin = "anonymous";
overlayImg.src = selectedPatternPath;
overlayImg.onload = drawCanvas;

let iconImg = new Image();
iconImg.crossOrigin = "anonymous";
iconImg.src = selectedIconPath;
iconImg.onload = drawCanvas;

// إعدادات النصوص
let globalTextSize = 150;
let texts = [
    { id: "part1", text: "Deck", x: 300, y: 520, angle: 0, color: "#FFFFFF" },
    {
        id: "part2",
        text: "Title",
        x: 700,
        y: 500,
        angle: 0,
        color: "rgba(255,255,255)",
    },
];

let draggingText = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
    const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;

    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
    };
}

function startDrag(e) {
    if (!ctx) return;
    const pos = getMousePos(e);

    for (let i = texts.length - 1; i >= 0; i--) {
        const t = texts[i];
        if (!t.text) continue; // تخطي النصوص الفارغة

        ctx.font = `${globalTextSize}px "FBWallW W34 Regular", sans-serif`;
        const width = ctx.measureText(t.text).width;
        const height = globalTextSize;

        const dx = pos.x - t.x;
        const dy = pos.y - t.y;
        const angleRad = (-t.angle * Math.PI) / 180;

        const rx = dx * Math.cos(angleRad) - dy * Math.sin(angleRad);
        const ry = dx * Math.sin(angleRad) + dy * Math.cos(angleRad);

        if (rx >= 0 && rx <= width && ry >= -height && ry <= height * 0.2) {
            draggingText = t;
            dragOffsetX = dx;
            dragOffsetY = dy;
            canvas.style.cursor = "grabbing";
            e.preventDefault();
            return;
        }
    }
}

function drag(e) {
    if (!draggingText) return;
    const pos = getMousePos(e);
    draggingText.x = pos.x - dragOffsetX;
    draggingText.y = pos.y - dragOffsetY;
    drawCanvas();
    e.preventDefault();
}

function endDrag() {
    draggingText = null;
    if (canvas) canvas.style.cursor = "grab";
}

if (canvas) {
    canvas.addEventListener("mousedown", startDrag);
    canvas.addEventListener("mousemove", drag);
    window.addEventListener("mouseup", endDrag);

    canvas.addEventListener("touchstart", startDrag, { passive: false });
    canvas.addEventListener("touchmove", drag, { passive: false });
    window.addEventListener("touchend", endDrag);
}

// دالة الرسم الأساسية
function drawCanvas() {
    if (!ctx) return;

    // 🔥 النظام الجديد لتقسيم الكلمات الذكي
    const titleInput = document.getElementById("deckTitle")?.value.trim();
    if (titleInput) {
        const titleWords = titleInput.split(/\s+/).filter((w) => w.length > 0);
        texts[0].text = titleWords[0];
        texts[1].text = titleWords.length > 1 ? titleWords[1] : ""; // لو كلمة واحدة تفضل فاضية
    } else {
        texts[0].text = "Deck";
        texts[1].text = "Title";
    }

    const yearFull = document.getElementById("deckYear")?.value || "5th Year";
    const yearShort = yearFull.split(" ")[0];

    const category =
        document.getElementById("deckCategory")?.value || "Theoretical";

    globalTextSize = parseInt(
        document.getElementById("ctrlTitleSize")?.value || 120,
    );
    texts[0].angle = parseInt(
        document.getElementById("ctrlPart1Angle")?.value || 0,
    );
    texts[1].angle = parseInt(
        document.getElementById("ctrlPart2Angle")?.value || 0,
    );

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = selectedColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (overlayImg.complete && overlayImg.naturalWidth > 0) {
        ctx.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);
    }

    // 🔴 3. رسم الأيقونة بمقاسها الحقيقي
    if (iconImg.complete && iconImg.naturalWidth > 0) {
        const iconWidth = iconImg.naturalWidth;
        const iconHeight = iconImg.naturalHeight;

        // الكود الآن يرسمها بحجمها الأصلي لمنع البكسلة. قم بتعديل X و Y فقط (1250 و 300).
        ctx.drawImage(iconImg, 1200, 80, 750, 750);
    }

    // رسم النصوص (لن يتم رسم النص الفارغ ولن يتم سحبه)
    texts.forEach((t) => {
        if (!t.text) return;
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate((t.angle * Math.PI) / 180);
        ctx.textAlign = "left";
        ctx.fillStyle = t.color;
        ctx.font = `${globalTextSize}px "FBWallW W34 Regular", sans-serif`;
        ctx.fillText(t.text, 0, 0);
        ctx.restore();
    });

    ctx.textAlign = "center";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `83.9pt "FBWallW W34 Regular", sans-serif`;
    ctx.fillText(yearShort, 750, 790);
    ctx.save();

    ctx.textAlign = "center";
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `60pt "FBWallW W34 Regular", sans-serif`;
    ctx.rotate((-5 * Math.PI) / 180);
    ctx.fillText(category, 920, 962);
    ctx.restore();
}

document.fonts.ready.then(() => {
    drawCanvas();
});

function initPickers() {
    const colorContainer = document.getElementById("colorPicker");
    if (colorContainer) colorContainer.innerHTML = "";
    brandColors.forEach((color) => {
        const div = document.createElement("div");
        div.className = `color-swatch ${color === selectedColor ? "active" : ""}`;
        div.style.backgroundColor = color;
        div.onclick = () => {
            document
                .querySelectorAll(".color-swatch")
                .forEach((el) => el.classList.remove("active"));
            div.classList.add("active");
            selectedColor = color;
            drawCanvas();
        };
        colorContainer?.appendChild(div);
    });

    const iconContainer = document.getElementById("iconPicker");
    if (iconContainer) iconContainer.innerHTML = "";
    availableIcons.forEach((iconObj) => {
        const img = document.createElement("img");
        img.src = iconObj.preview;
        img.className = `icon-option ${iconObj.preview === selectedIconPath ? "active" : ""}`;
        img.onclick = () => {
            document
                .querySelectorAll("#iconPicker .icon-option")
                .forEach((el) => el.classList.remove("active"));
            img.classList.add("active");
            selectedIconPath = iconObj.preview;
            iconImg.src = selectedIconPath;
        };
        iconContainer?.appendChild(img);
    });

    const patternContainer = document.getElementById("patternPicker");
    if (patternContainer) patternContainer.innerHTML = "";
    availablePatterns.forEach((patternObj) => {
        const img = document.createElement("img");
        img.src = patternObj.preview;
        img.style.width = "80px";
        img.style.height = "45px";
        img.style.objectFit = "cover";
        img.style.borderRadius = "6px";
        img.style.cursor = "pointer";
        img.style.border =
            patternObj.preview === selectedPatternPath
                ? "2px solid var(--main-color)"
                : "2px solid transparent";
        img.style.transition = "0.2s";

        img.onclick = () => {
            Array.from(patternContainer.children).forEach(
                (el) => (el.style.border = "2px solid transparent"),
            );
            img.style.border = "2px solid var(--main-color)";
            selectedPatternPath = patternObj.preview;
            overlayImg.src = selectedPatternPath;
        };
        patternContainer?.appendChild(img);
    });
}

initPickers();

[
    "deckTitle",
    "deckYear",
    "deckCategory",
    "ctrlTitleSize",
    "ctrlPart1Angle",
    "ctrlPart2Angle",
].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", drawCanvas);
});

// ==========================================
// 3. Form Submission, Native Canvas Export & Edit Mode
// ==========================================
const submitForm = document.getElementById("submitDeckForm");
const submitBtn = document.getElementById("submitBtn");

// متغيرات التحكم في واجهة التعديل
const urlParams = new URLSearchParams(window.location.search);
const editDeckId = urlParams.get("id");
const isEditMode = !!editDeckId;

const editBannerToggleWrapper = document.getElementById(
    "editBannerToggleWrapper",
);
const updateImageCheckbox = document.getElementById("updateImageCheckbox");
const bannerDesignSection = document.getElementById("bannerDesignSection");
const canvasPreviewWrapper = document.getElementById("canvasPreviewWrapper");
const staticImageWrapper = document.getElementById("staticImageWrapper");
const staticImagePreview = document.getElementById("staticImagePreview");

// 🔴 تجهيز واجهة وضع التعديل (Edit Mode)
if (isEditMode) {
    document.querySelector(".dashboard-title").innerHTML =
        `Update <span>Deck</span>`;
    if (submitBtn) {
        submitBtn.innerHTML =
            'Update Deck <i class="fa-solid fa-arrows-rotate fa-fw"></i>';
        submitBtn.style.background = "#ff9800";
    }

    if (editBannerToggleWrapper)
        editBannerToggleWrapper.style.display = "block";
    if (bannerDesignSection) bannerDesignSection.style.display = "none";
    if (canvasPreviewWrapper) canvasPreviewWrapper.style.display = "none";
    if (staticImageWrapper) staticImageWrapper.style.display = "block";

    if (updateImageCheckbox) {
        updateImageCheckbox.addEventListener("change", (e) => {
            if (e.target.checked) {
                if (bannerDesignSection)
                    bannerDesignSection.style.display = "block";
                if (canvasPreviewWrapper)
                    canvasPreviewWrapper.style.display = "block";
                if (staticImageWrapper)
                    staticImageWrapper.style.display = "none";
                drawCanvas();
            } else {
                if (bannerDesignSection)
                    bannerDesignSection.style.display = "none";
                if (canvasPreviewWrapper)
                    canvasPreviewWrapper.style.display = "none";
                if (staticImageWrapper)
                    staticImageWrapper.style.display = "block";
            }
        });
    }

    // جلب بيانات الكارت القديم وتعبئتها
    getDoc(doc(db, "decks", editDeckId))
        .then((docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                document.getElementById("deckTitle").value = data.title;
                document.getElementById("deckModule").value = data.module;
                document.getElementById("deckYear").value = data.year;
                document.getElementById("deckCategory").value = data.category;
                if (document.getElementById("deckType"))
                    document.getElementById("deckType").value =
                        data.type || "Theoretical";
                if (document.getElementById("deckVersion"))
                    document.getElementById("deckVersion").value =
                        data.version || "v1.0";
                document.getElementById("driveLink").value = data.downloadUrl;

                // تعبئة الوصف حسب وجود المحرر
                if (easyMDE) {
                    easyMDE.value(data.description || "");
                } else {
                    document.getElementById("deckDesc").value =
                        data.description || "";
                }

                if (staticImagePreview) staticImagePreview.src = data.imageUrl;

                // 🔥 النظام الجديد: التعامل مع الكروت المرفوضة
                if (data.status === "rejected") {
                    document.querySelector(".dashboard-title").innerHTML =
                        `Fix & Resubmit <span>Deck</span>`;
                    if (submitBtn) {
                        submitBtn.innerHTML =
                            'Resubmit for Review <i class="fa-solid fa-paper-plane fa-fw"></i>';
                        submitBtn.style.background = "#ff5252"; // لون أحمر للتنبيه
                    }

                    // إنشاء صندوق التنبيه بأسباب الرفض
                    const rejectionDiv = document.createElement("div");
                    rejectionDiv.style.cssText =
                        "background: rgba(255, 82, 82, 0.1); border-left: 4px solid #ff5252; padding: 15px; margin-bottom: 20px; border-radius: 4px;";

                    let reasonsHTML = "";
                    if (
                        data.rejectionReasons &&
                        data.rejectionReasons.length > 0
                    ) {
                        reasonsHTML = `<ul style="margin: 5px 0 10px 20px; color: #ff5252;">
                            ${data.rejectionReasons.map((r) => `<li>${r}</li>`).join("")}
                        </ul>`;
                    }

                    rejectionDiv.innerHTML = `
                        <h4 style="color: #ff5252; margin-top: 0;">⚠️ Action Required: Your deck needs some fixes</h4>
                        ${reasonsHTML}
                        <p style="margin: 0; color: var(--text-color);"><strong>Admin Note:</strong> ${data.rejectionNote || "No specific note provided."}</p>
                    `;

                    document
                        .getElementById("submitDeckForm")
                        .prepend(rejectionDiv);
                }

                setTimeout(drawCanvas, 500);
            }
        })
        .catch((err) =>
            console.error("Failed to fetch deck for editing:", err),
        );
}

// 🔴 كود الإرسال الذكي (يعالج الـ 3 حالات)
if (submitForm) {
    submitForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const title = document.getElementById("deckTitle").value.trim();
        const moduleName =
            document.getElementById("deckModule")?.value.trim() || "";
        const year = document.getElementById("deckYear").value;
        const category = document.getElementById("deckCategory").value;
        const type =
            document.getElementById("deckType")?.value || "Theoretical";
        const version =
            document.getElementById("deckVersion")?.value.trim() || "v1.0";
        const driveLink = document.getElementById("driveLink").value.trim();
        // const desc = document.getElementById("deckDesc").value.trim();
        const desc = easyMDE
            ? easyMDE.value().trim()
            : document.getElementById("deckDesc").value.trim();

        const showCreatorCheckbox = document.getElementById("showCreatorName");
        const finalCreatorName =
            showCreatorCheckbox && showCreatorCheckbox.checked
                ? currentCreatorName
                : "ASU Students";

        let directLink = driveLink;
        if (driveLink.includes("/d/") || driveLink.includes("id=")) {
            directLink = getDirectDriveLink(driveLink);
        }

        if (!directLink) {
            showModal(
                "Invalid Link",
                "Please paste a valid Google Drive file link.",
            );
            return;
        }

        if (submitBtn) {
            submitBtn.innerHTML =
                'Processing... <i class="fa-solid fa-spinner fa-spin"></i>';
            submitBtn.disabled = true;
        }

        try {
            const customDeckId = isEditMode
                ? editDeckId
                : `${title
                      .toLowerCase()
                      .replace(/[^a-zA-Z0-9\u0621-\u064A\s-]/g, "")
                      .trim()
                      .replace(
                          /\s+/g,
                          "-",
                      )}-${Math.random().toString(36).substring(2, 7)}`;

            // 🟢 حالة رقم 1: وضع التعديل + المستخدم لا يريد تحديث الصورة (حفظ سريع للنصوص فقط)
            if (
                isEditMode &&
                updateImageCheckbox &&
                !updateImageCheckbox.checked
            ) {
                await updateDoc(doc(db, "decks", customDeckId), {
                    title: title,
                    module: moduleName,
                    year: year,
                    category: category,
                    type: type,
                    version: version,
                    description: desc,
                    downloadUrl: directLink,
                    creator: finalCreatorName,
                    lastUpdate: new Date().toLocaleDateString("en-GB"),
                    status: "pending", // 🔥 إعادة الكارت للمراجعة
                    updatedAt: serverTimestamp(),
                });

                showModal(
                    "Success!",
                    "Deck details updated successfully without changing the image.",
                );
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 2000);
                return;
            }

            // 🟢 حالة رقم 2 & 3: إنشاء جديد أو تعديل مع تحديث الصورة
            canvas.toBlob(
                async (blob) => {
                    if (!blob) {
                        showModal(
                            "Error",
                            "Canvas generated a blank image. Make sure you are using a Live Server.",
                        );
                        resetBtn();
                        return;
                    }

                    try {
                        const bannerRef = ref(
                            storage,
                            `banners/${customDeckId}.webp`,
                        );
                        await uploadBytes(bannerRef, blob);
                        const generatedBannerUrl =
                            await getDownloadURL(bannerRef);

                        const deckData = {
                            title: title,
                            module: moduleName,
                            year: year,
                            category: category,
                            type: type,
                            version: version,
                            description: desc,
                            downloadUrl: directLink,
                            imageUrl: generatedBannerUrl,
                            creator: finalCreatorName,
                            creatorId: auth.currentUser.uid,
                            lastUpdate: new Date().toLocaleDateString("en-GB"),
                            isHidden: false,
                        };

                        if (isEditMode) {
                            deckData.updatedAt = serverTimestamp();
                            deckData.status = "pending"; // 🔥 إعادة الكارت للمراجعة
                            await updateDoc(
                                doc(db, "decks", customDeckId),
                                deckData,
                            );
                            showModal(
                                "Success!",
                                "Deck and image have been successfully updated.",
                            );
                            setTimeout(() => {
                                window.location.href = "index.html";
                            }, 2000);
                        } else {
                            deckData.status = "pending";
                            deckData.createdAt = serverTimestamp();
                            deckData.isDeleted = false;
                            await setDoc(
                                doc(db, "decks", customDeckId),
                                deckData,
                            );
                            showModal(
                                "Success!",
                                "Deck submitted and is now pending admin review.",
                            );
                            submitForm.reset();
                            drawCanvas();
                            resetBtn();
                        }
                    } catch (uploadError) {
                        console.error("Upload Error:", uploadError);
                        showModal("Error", "Failed to process data.");
                        resetBtn();
                    }
                },
                "image/webp",
                0.7,
            );
        } catch (error) {
            console.error("Submission Error:", error);
            showModal("Error", "Something went wrong.");
            resetBtn();
        }

        function resetBtn() {
            if (submitBtn) {
                submitBtn.innerHTML = isEditMode
                    ? 'Update Deck <i class="fa-solid fa-arrows-rotate fa-fw"></i>'
                    : 'Submit for Review <i class="fa-solid fa-paper-plane fa-fw"></i>';
                submitBtn.disabled = false;
            }
        }
    });
}
