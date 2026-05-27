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
// 2. Interactive Canvas Engine (Fabric.js)
// ==========================================
const BASE_W = 1920;
const BASE_H = 1080;

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
    "#FDD835",
    "#FB8C00",
    "#F4511E",
    "#6D4C41",
];

const availableIcons = [
    { id: "icon-anatomy", preview: "../images/icons/anatomy.png" },
    { id: "icon-pharma", preview: "../images/icons/pharma.png" },
    { id: "icon-micro", preview: "../images/icons/micro.png" },
];

let selectedColor = brandColors[5];
let selectedIconPath = availableIcons[0]?.preview;

let fCanvas = null;
let textPart1, textPart2, yearGroup;
let bgOverlay, iconLayer;

function hideManualControls() {
    const titleSizeCtrl = document.getElementById("ctrlTitleSize");
    if (titleSizeCtrl) {
        const panel = titleSizeCtrl.closest('div[style*="background"]');
        if (panel) panel.style.display = "none";
    }
}

// 🔥 نظام المقاسات الجديد: بيكبر ويصغر كـ CSS بس وبيحفظ الـ 1920 في الذاكرة
function applyResponsiveFix() {
    if (!fCanvas) return;
    const previewWrapper = document.querySelector(".banner-preview-wrapper");
    if (!previewWrapper) return;

    let cw = previewWrapper.clientWidth;
    if (cw < 100) cw = window.innerWidth > 840 ? 800 : window.innerWidth - 40;
    if (cw > 800) cw = 800; // أقصى عرض للكانفاس في الشاشة

    const ch = cw * (BASE_H / BASE_W); // حساب الطول ليكون 16:9 دايماً

    // تغيير مقاس الرؤية فقط (CSS) بدون المساس بجودة الكانفاس الأصلية
    fCanvas.setDimensions(
        {
            width: cw + "px",
            height: ch + "px",
        },
        { cssOnly: true },
    );

    fCanvas.calcOffset(); // مزامنة حركة الماوس مع الحجم الجديد

    // تجميل إطار الكانفاس
    if (fCanvas.wrapperEl) {
        fCanvas.wrapperEl.style.margin = "0 auto";
        fCanvas.wrapperEl.style.borderRadius = "12px";
        fCanvas.wrapperEl.style.boxShadow = "0 4px 15px rgba(0,0,0,0.3)";
        fCanvas.wrapperEl.style.border = "1px solid var(--ver-tag-color)";
        fCanvas.wrapperEl.style.overflow = "hidden";
    }
}

function initFabric() {
    if (typeof fabric === "undefined") {
        console.error("Fabric.js is missing! Check HTML script tag.");
        return;
    }

    fCanvas = new fabric.Canvas("bannerCanvas", {
        preserveObjectStacking: true,
        selection: false,
    });

    // 🔴 تثبيت الجودة الأصلية في الذاكرة (1920x1080)
    fCanvas.setWidth(BASE_W);
    fCanvas.setHeight(BASE_H);
    fCanvas.backgroundColor = selectedColor;

    applyResponsiveFix();
    window.addEventListener("resize", applyResponsiveFix);

    const fixedImgSettings = {
        originX: "left",
        originY: "top",
        left: 0,
        top: 0,
        selectable: false,
        evented: false,
    };

    fabric.Image.fromURL("../images/template_overlay.png", (img) => {
        bgOverlay = img;
        bgOverlay.set(fixedImgSettings);
        fCanvas.add(bgOverlay);
        fCanvas.sendToBack(bgOverlay);
    });

    fabric.Image.fromURL(selectedIconPath, (img) => {
        iconLayer = img;
        iconLayer.set(fixedImgSettings);
        fCanvas.add(iconLayer);
        ensureTextsOnTop();
    });

    document.fonts.ready.then(() => {
        const textControlsConfig = {
            fontFamily: "FBWallW W34 Regular",
            fontSize: 120,
            selectable: true,
            transparentCorners: false,
            cornerColor: "var(--main-color, #E53935)",
            cornerStrokeColor: "#ffffff",
            cornerStyle: "circle",
            borderColor: "rgba(255, 255, 255, 0.7)",
            cornerSize: 16,
            padding: 15,
            lockScalingFlip: true,
        };

        textPart1 = new fabric.Text("Deck", {
            ...textControlsConfig,
            left: 120,
            top: 400,
            fill: "#FFFFFF",
        });

        textPart2 = new fabric.Text("Module", {
            ...textControlsConfig,
            left: 120,
            top: 550,
            fill: "rgba(255, 255, 255, 0.8)",
        });

        const yearRect = new fabric.Rect({
            width: 250,
            height: 90,
            rx: 20,
            ry: 20,
            fill: "rgba(0,0,0,0.3)",
            originX: "center",
            originY: "center",
        });
        const yearText = new fabric.Text("5th", {
            fontFamily: "FBWallW W34 Regular",
            fill: "#FFFFFF",
            fontSize: 45,
            originX: "center",
            originY: "center",
        });

        yearGroup = new fabric.Group([yearRect, yearText], {
            left: 120,
            top: 700,
            selectable: false,
            evented: false,
        });

        fCanvas.add(textPart1, textPart2, yearGroup);
        fCanvas.renderAll();

        updateBannerContent();
        hideManualControls();
    });
}

function ensureTextsOnTop() {
    if (fCanvas && textPart1 && textPart2 && yearGroup) {
        fCanvas.bringToFront(textPart1);
        fCanvas.bringToFront(textPart2);
        fCanvas.bringToFront(yearGroup);
        fCanvas.renderAll();
    }
}

function updateBannerContent() {
    if (!fCanvas || !textPart1 || !textPart2 || !yearGroup) return;

    const titleInput =
        document.getElementById("deckTitle")?.value.trim() || "Deck Title";
    const yearFull = document.getElementById("deckYear")?.value || "5th Year";

    const titleWords = titleInput.split(/\s+/).filter((w) => w.length > 0);
    textPart1.set("text", titleWords[0] || "Deck");
    textPart2.set("text", titleWords.length > 1 ? titleWords[1] : "Module");

    const yearShort = yearFull.split(" ")[0];
    yearGroup.item(1).set("text", yearShort);

    ensureTextsOnTop();
}

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
            if (fCanvas) {
                fCanvas.backgroundColor = color;
                fCanvas.renderAll();
            }
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
                .querySelectorAll(".icon-option")
                .forEach((el) => el.classList.remove("active"));
            img.classList.add("active");
            selectedIconPath = iconObj.preview;
            if (fCanvas && iconLayer) {
                iconLayer.setSrc(selectedIconPath, () => {
                    ensureTextsOnTop();
                });
            }
        };
        iconContainer?.appendChild(img);
    });
}

initPickers();
initFabric();

["deckTitle", "deckYear"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", updateBannerContent);
});

// ==========================================
// 3. Form Submission & Firebase Storage
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

        if (!fCanvas) {
            showModal("Error", "Canvas engine not loaded. Please refresh.");
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

            // إخفاء مربعات التحديد للمستخدم
            fCanvas.discardActiveObject();
            fCanvas.renderAll();

            // 🔥 استخدام الكانفاس الخام (Native Canvas) لاستخراج الصورة بجودة 100% بدون Base64
            const htmlCanvas = fCanvas.toCanvasElement();

            htmlCanvas.toBlob(
                async (blob) => {
                    if (!blob) {
                        showModal("Error", "Failed to generate image.");
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.innerHTML =
                                'Submit for Review <i class="fa-solid fa-paper-plane fa-fw"></i>';
                        }
                        return;
                    }

                    try {
                        // الرفع السلس للـ Blob مباشرة
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
                        updateBannerContent();

                        if (submitBtn) {
                            submitBtn.innerHTML =
                                'Submit for Review <i class="fa-solid fa-paper-plane fa-fw"></i>';
                            submitBtn.disabled = false;
                        }
                    } catch (uploadError) {
                        console.error("Upload Error:", uploadError);
                        showModal(
                            "Error",
                            "Failed to upload image. Please try again.",
                        );
                        if (submitBtn) {
                            submitBtn.disabled = false;
                            submitBtn.innerHTML =
                                'Submit for Review <i class="fa-solid fa-paper-plane fa-fw"></i>';
                        }
                    }
                },
                "image/webp",
                0.6,
            ); // الجودة 0.6 مناسبة جداً للسرعة والوضوح
        } catch (error) {
            console.error("Submission Error:", error);
            showModal("Error", "Something went wrong. Please try again.");
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML =
                    'Submit for Review <i class="fa-solid fa-paper-plane fa-fw"></i>';
            }
        }
    });
}
