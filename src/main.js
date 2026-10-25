
import "./style.css";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const viewport = document.querySelector(".slides-viewport");
const track = document.querySelector("#slides-track");
const slides = [...document.querySelectorAll(".slide")];
const navItems = [...document.querySelectorAll(".nav-item")];
const currentIndex = document.querySelector("#current-index");

let horizontalTween;
let activeIndex = -1;
let animationContext;
let resizeTimer;
let wheelLockTimer;

const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
);



/* =========================================
   DÉCLENCHEMENT DE LA PAGE TOURNÉE
   ========================================= */

const pageTurnOverlay = document.querySelector("#page-turn-overlay");
let pageTurnTimer;

function playPageTurn() {
    if (!pageTurnOverlay || reduceMotion.matches) return;

    clearTimeout(pageTurnTimer);

    // Réinitialiser l'animation pour pouvoir la rejouer.
    pageTurnOverlay.classList.remove("is-turning");
    void pageTurnOverlay.offsetWidth;
    pageTurnOverlay.classList.add("is-turning");

    pageTurnTimer = setTimeout(() => {
        pageTurnOverlay.classList.remove("is-turning");
    }, 1100);
}

const waterTransition = document.querySelector("#water-transition");
let waterTransitionTimer;

function playWaterTransition() {
    if (!waterTransition || reduceMotion.matches) return;

    clearTimeout(waterTransitionTimer);

    waterTransition.classList.remove("is-active");
    track.classList.remove("is-water-distorted");

    // Relance les animations à chaque changement
    void waterTransition.offsetWidth;

    waterTransition.classList.add("is-active");
    track.classList.add("is-water-distorted");

    waterTransitionTimer = setTimeout(() => {
        waterTransition.classList.remove("is-active");
        track.classList.remove("is-water-distorted");
    }, 1500);
}

function updateNavigation(index) {
    const next = Math.max(0, Math.min(index, slides.length - 1));

    if (next !== activeIndex && activeIndex !== -1) {
        playWaterTransition();
    }

    // // Ne pas animer le chargement initial.
    // if (activeIndex !== -1) {
    //     playPageTurn();
    // }

    activeIndex = next;

    navItems.forEach((item, i) => {
        const active = i === next;
        item.classList.toggle("is-active", active);

        if (active) {
            item.setAttribute("aria-current", "page");
        } else {
            item.removeAttribute("aria-current");
        }
    });

    currentIndex.textContent = String(next + 1).padStart(2, "0");
}

function getDistance() {
    return Math.max(0, track.scrollWidth - viewport.clientWidth);
}

function navigateToSlide(index) {
    const trigger = horizontalTween?.scrollTrigger;

    if (!trigger) return;

    const next = Math.max(0, Math.min(index, slides.length - 1));
    const progress = next / Math.max(1, slides.length - 1);
    const destination =
        trigger.start + progress * (trigger.end - trigger.start);

    window.scrollTo({
        top: destination,
        behavior: reduceMotion.matches ? "auto" : "smooth"
    });

    history.replaceState(null, "", `#${slides[next].id}`);
}

viewport.addEventListener("wheel", (event) => {
    if (!horizontalTween?.scrollTrigger || event.ctrlKey) return;

    if (event.target.closest("input, textarea, select, [contenteditable='true']")) {
        return;
    }

    event.preventDefault();

    if (wheelLockTimer) return;

    const direction = Math.sign(event.deltaY || event.deltaX);
    if (!direction) return;

    const nextIndex = Math.max(
        0,
        Math.min(activeIndex + direction, slides.length - 1)
    );
    navigateToSlide(nextIndex);

    wheelLockTimer = setTimeout(() => {
        wheelLockTimer = null;
    }, 850);
}, { passive: false });

function initHorizontalScroll() {
    // Nettoyer les anciennes animations lors d'une reconstruction
    animationContext?.revert();
    animationContext = null;

    if (horizontalTween) {
        horizontalTween.scrollTrigger?.kill();
        horizontalTween.kill();
        horizontalTween = null;
    }

    gsap.set(track, { clearProps: "transform" });

    if (getDistance() <= 0) {
        updateNavigation(0);
        return;
    }

    horizontalTween = gsap.to(track, {
        x: () => -getDistance(),
        ease: "none",

        scrollTrigger: {
            trigger: viewport,
            pin: true,
            start: "top top",
            end: () => `+=${getDistance()}`,

            // Le mouvement est lié au scroll, mais très amorti.
            scrub: 0.65,

            // Chaque arrêt correspond à une slide entière.
            snap: {
                snapTo: (progress) => {
                    const lastIndex = slides.length - 1;
                    return Math.round(progress * lastIndex) / lastIndex;
                },
                delay: 0.15,
                duration: { min: 0.35, max: 0.65 },
                ease: "power3.inOut",
                inertia: false
            },

            invalidateOnRefresh: true,
            anticipatePin: 1,

            onUpdate: (self) => {
                const index = Math.round(self.progress * (slides.length - 1));
                updateNavigation(index);
            },

            onRefresh: (self) => {
                const index = Math.round(self.progress * (slides.length - 1));
                updateNavigation(index);
            }
        }
    });

    // Les animations utilisent le mouvement horizontal comme référence
    animationContext = gsap.context(() => {
        if (reduceMotion.matches) {
            gsap.set("[data-animate]", {
                clearProps: "all"
            });
            return;
        }

        slides.forEach(slide => {
            const eyebrow = slide.querySelector('[data-animate="eyebrow"]');
            const title = slide.querySelector('[data-animate="title"]');
            const description = slide.querySelector(
                '[data-animate="description"]'
            );
            const cta = slide.querySelector('[data-animate="cta"]');

            const elements = [
                eyebrow,
                title,
                description,
                cta
            ].filter(Boolean);

            if (elements.length) {
                gsap.from(elements, {
                    y: 35,
                    opacity: 0,
                    filter: "blur(8px)",
                    duration: 0.9,
                    stagger: 0.13,
                    ease: "power3.out",
                    immediateRender: false,
                    scrollTrigger: {
                        trigger: slide,
                        containerAnimation: horizontalTween,
                        start: "left right",
                        end: "left 42%",
                        toggleActions: "play none none reverse"
                    }
                });
            }

            // Déplacement subtil des illustrations
            const parallax = slide.querySelector("[data-parallax]");

            if (parallax) {
                const intensity = Number(parallax.dataset.parallax) || 0.1;

                gsap.fromTo(
                    parallax,
                    { x: 45 * Math.sign(intensity || 1) },
                    {
                        x: -45 * Math.sign(intensity || 1),
                        ease: "none",
                        scrollTrigger: {
                            trigger: slide,
                            containerAnimation: horizontalTween,
                            start: "left right",
                            end: "right left",
                            scrub: true
                        }
                    }
                );
            }
        });

        // Flottement des objets décoratifs
        gsap.to(".orb-inner", {
            y: -12,
            rotation: 8,
            duration: 3.5,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });

        gsap.to(".orb-core", {
            scale: 1.13,
            duration: 2.5,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });

        gsap.to(".panel-sphere", {
            y: -12,
            duration: 3,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
    });

    ScrollTrigger.refresh();
}

// Navigation du menu
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", event => {
        const id = link.getAttribute("href").slice(1);
        const index = slides.findIndex(slide => slide.id === id);

        if (index < 0) return;

        event.preventDefault();
        navigateToSlide(index);
    });
});

// Clavier
document.addEventListener("keydown", event => {
    if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.target.closest(
            'input, textarea, select, [contenteditable="true"]'
        )
    ) {
        return;
    }

    if (event.key === "ArrowRight") {
        event.preventDefault();
        navigateToSlide(activeIndex + 1);
    } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        navigateToSlide(activeIndex - 1);
    } else if (event.key === "Home") {
        event.preventDefault();
        navigateToSlide(0);
    } else if (event.key === "End") {
        event.preventDefault();
        navigateToSlide(slides.length - 1);
    }
});

// Démarrage après le chargement des ressources
function startExperience() {
    initHorizontalScroll();

    const id = window.location.hash.slice(1);
    const index = slides.findIndex(slide => slide.id === id);

    if (index >= 0) {
        requestAnimationFrame(() => navigateToSlide(index));
    }
}

if (document.readyState === "complete") {
    startExperience();
} else {
    window.addEventListener("load", startExperience, { once: true });
}

// Recalcul après redimensionnement
window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(() => {
        initHorizontalScroll();
        ScrollTrigger.refresh();
    }, 250);
});

// Réagir si la préférence de réduction des animations change
reduceMotion.addEventListener?.("change", () => {
    initHorizontalScroll();
});


// =====================================
// REFLET INTERACTIF DU VERRE
// =====================================

const glassElements = document.querySelectorAll(
    ".glass-nav, .glass-card"
);

glassElements.forEach((element) => {
    element.addEventListener("pointermove", (event) => {
        const rect = element.getBoundingClientRect();

        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;

        element.style.setProperty("--light-x", `${x}%`);
        element.style.setProperty("--light-y", `${y}%`);
    });

    element.addEventListener("pointerleave", () => {
        element.style.setProperty("--light-x", "50%");
        element.style.setProperty("--light-y", "0%");
    });
});


// =====================================
// CURSEUR IMMERSIF
// =====================================

const cursor = document.querySelector(".custom-cursor");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
const motionPreference = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
);

if (cursor && finePointer.matches && !motionPreference.matches) {
    let cursorX = 0;
    let cursorY = 0;

    gsap.set(cursor, { x: -100, y: -100 });

    window.addEventListener("pointermove", (event) => {
        cursorX = event.clientX;
        cursorY = event.clientY;

        cursor.classList.add("is-visible");

        gsap.to(cursor, {
            x: cursorX,
            y: cursorY,
            duration: 0.16,
            ease: "power2.out",
            overwrite: true
        });
    });

    document.addEventListener("pointerover", (event) => {
        if (event.target.closest("a, button, .nav-item")) {
            cursor.classList.add("is-hovering");
        }
    });

    document.addEventListener("pointerout", (event) => {
        if (
            event.target.closest("a, button, .nav-item") &&
            !event.relatedTarget?.closest("a, button, .nav-item")
        ) {
            cursor.classList.remove("is-hovering");
        }
    });

    document.addEventListener("pointerleave", () => {
        cursor.classList.remove("is-visible");
    });

    document.addEventListener("pointerenter", () => {
        cursor.classList.add("is-visible");
    });
}


const rsvpForm = document.querySelector("#rsvp-form");
const rsvpMessage = document.querySelector("#rsvp-message");

rsvpForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!rsvpForm.reportValidity()) return;

    rsvpMessage.textContent =
        "Le formulaire est prêt. La réception des réponses doit encore être configurée.";

    // Aucune réponse n'est enregistrée ou envoyée à ce stade.
});