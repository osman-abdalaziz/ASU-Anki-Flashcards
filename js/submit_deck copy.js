import { db, auth } from "./config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection,
    serverTimestamp,
    doc,
    getDoc,
    setDoc,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showModal } from "./ui.js";
import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

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
// 3. Form Submission & Native Canvas Export
// ==========================================
const submitForm = document.getElementById("submitDeckForm");
const submitBtn = document.getElementById("submitBtn");

if (submitForm) {
    submitForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const title = document.getElementById("deckTitle").value.trim();
        const moduleName =
            document.getElementById("deckModule")?.value.trim() || "";
        const year = document.getElementById("deckYear").value;
        const category = document.getElementById("deckCategory").value;
        const driveLink = document.getElementById("driveLink").value.trim();
        const desc = document.getElementById("deckDesc").value.trim();

        const showCreatorCheckbox = document.getElementById("showCreatorName");
        const isNameVisible = showCreatorCheckbox
            ? showCreatorCheckbox.checked
            : true;
        const finalCreatorName = isNameVisible
            ? currentCreatorName
            : "ASU Students";

        const directLink = getDirectDriveLink(driveLink);

        if (!directLink) {
            showModal(
                "Invalid Link",
                "Please paste a valid Google Drive file link.",
            );
            return;
        }

        if (submitBtn) {
            submitBtn.innerHTML =
                'Submitting... <i class="fa-solid fa-spinner fa-spin"></i>';
            submitBtn.disabled = true;
        }

        try {
            const randomChars = Math.random().toString(36).substring(2, 7);
            const cleanTitle = title
                .toLowerCase()
                .replace(/[^a-zA-Z0-9\u0621-\u064A\s-]/g, "")
                .trim()
                .replace(/\s+/g, "-");
            const customDeckId = `${cleanTitle}-${randomChars}`;

            // استخراج وتوليد الصورة مباشرة (Native)
            canvas.toBlob(
                async (blob) => {
                    // 🔥 رسالة الخطأ دي مستحيل تظهر لو شغال Live Server
                    if (!blob) {
                        showModal(
                            "Error",
                            "Canvas generated a blank image. You must run the site via Live Server to upload images.",
                        );
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.innerHTML =
                                'Submit for Review <i class="fa-solid fa-paper-plane fa-fw"></i>';
                        }
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

                        await setDoc(doc(db, "decks", customDeckId), {
                            title: title,
                            module: moduleName,
                            year: year,
                            category: category,
                            description: desc,
                            downloadUrl: directLink,
                            imageUrl: generatedBannerUrl,
                            version: "v1.0",
                            creator: finalCreatorName,
                            creatorId: auth.currentUser.uid,
                            status: "pending",
                            createdAt: serverTimestamp(),
                            lastUpdate: new Date().toLocaleDateString("en-GB"),
                            isDeleted: false,
                            isHidden: false,
                        });

                        showModal(
                            "Success!",
                            "Deck submitted and is now pending admin review.",
                        );

                        submitForm.reset();
                        texts[0].x = 300;
                        texts[0].y = 520;
                        texts[0].angle = 0;
                        texts[1].x = 700;
                        texts[1].y = 500;
                        texts[1].angle = 0;

                        if (document.getElementById("ctrlTitleSize"))
                            document.getElementById("ctrlTitleSize").value =
                                120;
                        if (document.getElementById("ctrlPart1Angle"))
                            document.getElementById("ctrlPart1Angle").value = 0;
                        if (document.getElementById("ctrlPart2Angle"))
                            document.getElementById("ctrlPart2Angle").value = 0;

                        drawCanvas();

                        if (submitBtn) {
                            submitBtn.innerHTML =
                                'Submit for Review <i class="fa-solid fa-paper-plane fa-fw"></i>';
                            submitBtn.disabled = false;
                        }
                    } catch (uploadError) {
                        console.error("Upload Error:", uploadError);
                        showModal("Error", "Failed to upload image to server.");
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.innerHTML =
                                'Submit for Review <i class="fa-solid fa-paper-plane fa-fw"></i>';
                        }
                    }
                },
                "image/webp",
                0.7,
            );
        } catch (error) {
            console.error("Submission Error:", error);
            showModal("Error", "Something went wrong.");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML =
                    'Submit for Review <i class="fa-solid fa-paper-plane fa-fw"></i>';
            }
        }
    });
}
