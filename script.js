/**
 * Cecil Abotsivia | Site behaviour
 * - Responsive navigation (mobile menu, scroll state, current-page highlight)
 * - Scroll reveal with staggered entry
 * - Subtle hero parallax on wide screens
 * - Contact form: validation, JSON submit to the Node.js API, email fallback
 */
(() => {
  "use strict";

  /* ---------- Helpers ---------- */
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const isWide = () => window.matchMedia("(min-width: 901px)").matches;
  const isDesktopNav = () => window.matchMedia("(min-width: 721px)").matches;

  document.documentElement.classList.add("js");

  /* ---------- Footer year ---------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Navigation ---------- */
  const navbar = $("#navbar");
  const toggle = $("#navToggle");
  const navLinks = $("#navLinks");

  const setMenu = (open) => {
    if (!toggle || !navLinks) return;
    toggle.setAttribute("aria-expanded", String(open));
    navLinks.classList.toggle("open", open);
    document.body.classList.toggle("menu-open", open);
    if (open) {
      const firstLink = $("a", navLinks);
      if (firstLink) firstLink.focus({ preventScroll: true });
    }
  };

  if (toggle) {
    toggle.addEventListener("click", (event) => {
      event.stopPropagation();
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });
  }

  $$("a", navLinks || document).forEach((link) =>
    link.addEventListener("click", () => setMenu(false))
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && toggle?.getAttribute("aria-expanded") === "true") {
      setMenu(false);
      toggle.focus();
    }
  });

  document.addEventListener("click", (event) => {
    if (navbar && !navbar.contains(event.target)) setMenu(false);
  });

  // Close the mobile menu automatically when the screen becomes wide.
  window.matchMedia("(min-width: 721px)").addEventListener("change", (event) => {
    if (event.matches) setMenu(false);
  });

  // Mark the current page's link (CSS styles it through aria-current).
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  $$("a", navLinks || document).forEach((link) => {
    if (link.getAttribute("href") === currentPage) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  // Add a frosted background to the navbar after scrolling, using one rAF per frame.
  let ticking = false;
  let lastScrollY = window.scrollY;
  const onScroll = () => {
    lastScrollY = window.scrollY;
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      navbar?.classList.toggle("scrolled", lastScrollY > 24);
      updateParallax();
      ticking = false;
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Scroll reveal (staggered per group) ---------- */
  const revealItems = $$(".reveal");

  if (!("IntersectionObserver" in window) || reduceMotion.matches) {
    revealItems.forEach((el) => el.classList.add("is-visible"));
  } else {
    // Stagger siblings so grids and timelines cascade in instead of popping.
    const groups = new Map();
    revealItems.forEach((el) => {
      const parent = el.parentElement;
      const index = groups.get(parent) || 0;
      groups.set(parent, index + 1);
      el.style.transitionDelay = `${Math.min(index, 6) * 90}ms`;
    });

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealItems.forEach((el) => revealObserver.observe(el));
  }

  /* ---------- Images fade in once loaded ---------- */
  $$("img").forEach((img) => {
    const markLoaded = () => img.classList.add("is-loaded");
    if (img.complete && img.naturalWidth > 0) markLoaded();
    else img.addEventListener("load", markLoaded, { once: true });
  });

  /* ---------- Hero parallax (wide screens, motion allowed) ---------- */
  const heroImg = $(".hero-img");

  function updateParallax() {
    if (!heroImg || reduceMotion.matches || !isWide()) {
      if (heroImg) heroImg.style.transform = "";
      return;
    }
    const offset = Math.min(window.scrollY, 800);
    heroImg.style.transform = `translate3d(0, ${(offset * 0.06).toFixed(1)}px, 0)`;
  }

  /* ---------- Links that should not navigate ---------- */
  $$("[aria-disabled='true']").forEach((el) =>
    el.addEventListener("click", (event) => event.preventDefault())
  );

  // Project buttons still set to "#" (replace with real URLs when ready).
  $$("a.project-link[href='#']").forEach((el) =>
    el.addEventListener("click", (event) => event.preventDefault())
  );

  /* ---------- Contact form ---------- */
  const form = $("#contactForm");
  if (form) {
    const statusEl = $("#formStatus");
    const submitBtn = $("button[type='submit']", form);
    const fields = $$("input, textarea", form);
    const endpoint = form.dataset.endpoint || "/api/contact";
    const contactEmail = $("a[href^='mailto:']")?.getAttribute("href").replace("mailto:", "") || "";

    const rules = {
      name: (v) => v.trim().length >= 2 || "Please enter your name.",
      email: (v) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || "Please enter a valid email address.",
      message: (v) =>
        v.trim().length >= 10 || "Your message should be at least 10 characters.",
    };

    const setError = (input, message) => {
      const wrapper = input.closest(".field");
      const errorEl = $("#" + input.name + "Error", form);
      const isValid = message === "";
      wrapper.classList.toggle("invalid", !isValid);
      input.setAttribute("aria-invalid", String(!isValid));
      if (errorEl) errorEl.textContent = message;
      return isValid;
    };

    const validateField = (input) => {
      const rule = rules[input.name];
      const result = rule ? rule(input.value) : true;
      return setError(input, result === true ? "" : result);
    };

    const setStatus = (message, type = "info") => {
      if (!statusEl) return;
      statusEl.textContent = message;
      statusEl.classList.toggle("error-text", type === "error");
    };

    const setBusy = (busy) => {
      if (!submitBtn) return;
      submitBtn.disabled = busy;
      submitBtn.textContent = busy ? "Sending..." : "Send Message";
    };

    const openMailClient = (data) => {
      const subject = encodeURIComponent("Website enquiry from " + data.name);
      const body = encodeURIComponent(
        `${data.message}\n\nFrom: ${data.name} <${data.email}>`
      );
      window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
    };

    fields.forEach((input) => {
      input.addEventListener("blur", () => validateField(input));
      input.addEventListener("input", () => {
        if (input.closest(".field").classList.contains("invalid")) validateField(input);
      });
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      let firstInvalid = null;
      fields.forEach((input) => {
        if (!validateField(input) && !firstInvalid) firstInvalid = input;
      });
      if (firstInvalid) {
        setStatus("Please fix the highlighted fields.", "error");
        firstInvalid.focus();
        return;
      }

      const payload = Object.fromEntries(new FormData(form).entries());
      setBusy(true);
      setStatus("Sending your message...");

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        const result = await response.json().catch(() => ({}));

        if (response.status === 422 && result.errors) {
          Object.entries(result.errors).forEach(([name, message]) => {
            const input = form.elements[name];
            if (input) setError(input, message);
          });
          setStatus("Please check the highlighted fields.", "error");
          return;
        }

        if (response.status === 429) {
          setStatus(result.error || "Too many messages. Please try again later.", "error");
          return;
        }

        if (!response.ok || !result.ok) throw new Error("Request failed");

        form.reset();
        fields.forEach((input) => setError(input, ""));
        setStatus(result.message || "Thank you. Your message has been sent.");
      } catch (error) {
        // No API reachable (for example, a static host): fall back to the email app.
        if (error.name === "AbortError" || error.name === "TypeError" || error.message === "Request failed") {
          setStatus("Opening your email app so you can send the message directly...");
          openMailClient(payload);
        } else {
          setStatus("Something went wrong. Please try again.", "error");
        }
      } finally {
        clearTimeout(timeout);
        setBusy(false);
      }
    });
  }
})();