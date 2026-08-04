"use strict";

(() => {
  const releasesUrl = "https://github.com/Nexiii/OrbDeck/releases";
  const manifestUrl = "https://raw.githubusercontent.com/Nexiii/OrbDeck/main/latest.json";

  function readRelease(manifest) {
    if (!manifest || typeof manifest !== "object") return null;
    const version = String(manifest.version || "").trim().replace(/^v/i, "");
    const platform = manifest.platforms?.["windows-x86_64"];
    if (!/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?(?:\+[a-z0-9.-]+)?$/i.test(version) || !platform) return null;

    try {
      const download = new URL(String(platform.url || ""));
      const releasePath = download.pathname.match(/^\/Nexiii\/OrbDeck\/releases\/download\/([^/]+)\//i);
      if (download.protocol !== "https:" || download.hostname !== "github.com" || !releasePath) return null;
      return {
        version,
        downloadUrl: download.href,
        releaseUrl: `${releasesUrl}/tag/${encodeURIComponent(releasePath[1])}`,
        size: Number(platform.size) || null,
      };
    } catch {
      return null;
    }
  }

  function applyRelease(release) {
    document.querySelectorAll("[data-release-download]").forEach((link) => {
      link.href = release.downloadUrl;
    });
    document.querySelectorAll("[data-release-notes]").forEach((link) => {
      link.href = release.releaseUrl;
    });
    document.querySelectorAll("[data-release-text]").forEach((element) => {
      const type = element.dataset.releaseText;
      if (type === "version") element.textContent = `v${release.version}`;
      if (type === "beta") element.textContent = `Beta ${release.version}`;
      if (type === "label") element.textContent = `OrbDeck ${release.version}`;
      if (type === "size") element.textContent = release.size ? `${(release.size / 1024 / 1024).toFixed(1)} MB` : "Windows 10 / 11";
    });
  }

  fetch(`${manifestUrl}?cache=${Date.now()}`, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error("Release manifest unavailable");
      return response.json();
    })
    .then(readRelease)
    .then((release) => release && applyRelease(release))
    .catch(() => undefined);

  const menuToggle = document.querySelector(".menu-toggle");
  const siteNav = document.querySelector(".site-nav");
  const closeMenu = () => {
    siteNav?.classList.remove("is-open");
    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Open menu");
    }
  };

  menuToggle?.addEventListener("click", () => {
    const open = !siteNav?.classList.contains("is-open");
    siteNav?.classList.toggle("is-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  document.querySelectorAll(".site-nav a, .site-header .brand").forEach((link) => link.addEventListener("click", closeMenu));
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });

  const capabilityGroups = [
    {
      index: "A",
      title: "Stream",
      kicker: "OBS Studio",
      headline: "Run the show from anywhere.",
      status: "OBS ready",
      icon: "./assets/icons/obs.svg",
      copy: "Everything around OBS without leaving the room or reaching for the mouse.",
      items: ["Scenes and sources", "Stream and recording", "Studio Mode and transitions", "Replay Buffer"],
      nodes: ["Scenes", "Record", "Replay"],
    },
    {
      index: "B",
      title: "Control",
      kicker: "Windows actions",
      headline: "One tap. Any action.",
      status: "Local link",
      icon: "./assets/icons/hotkeys.svg",
      copy: "Use the same deck for Windows, games and the apps already in your setup.",
      items: ["Apps, files and URLs", "Steam games", "Hotkeys and media", "Multi-actions"],
      nodes: ["Apps", "Games", "Macros"],
    },
    {
      index: "C",
      title: "Monitor",
      kicker: "Live widgets",
      headline: "See your setup at a glance.",
      status: "Live data",
      icon: "./assets/icons/music.svg",
      copy: "Live widgets make the phone feel like a remote, not a folder of shortcuts.",
      items: ["Volume and microphone", "Now Playing", "CPU, GPU and RAM", "OBS status"],
      nodes: ["Audio", "Media", "System"],
    },
  ];

  const capabilityTabs = Array.from(document.querySelectorAll(".capability-tab"));
  const capabilityPanel = document.querySelector(".capability-panel");

  function selectCapability(index, focus = false) {
    const group = capabilityGroups[index];
    if (!group || !capabilityPanel) return;
    capabilityTabs.forEach((tab, tabIndex) => {
      const active = tabIndex === index;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    capabilityPanel.setAttribute("aria-labelledby", `capability-tab-${index}`);
    capabilityPanel.innerHTML = `
      <div class="capability-panel-bar">
        <span>Active module / ${group.index}</span>
        <span class="capability-live"><i></i>${group.status}</span>
      </div>
      <div class="capability-panel-body">
        <div class="capability-panel-copy">
          <p>${group.kicker}</p>
          <h3>${group.headline}</h3>
          <p>${group.copy}</p>
          <ul>${group.items.map((item, itemIndex) => `<li><span>0${itemIndex + 1}</span>${item}</li>`).join("")}</ul>
        </div>
        <div class="capability-orbit" aria-hidden="true">
          <div class="capability-orbit-ring ring-outer"></div>
          <div class="capability-orbit-ring ring-inner"></div>
          <div class="capability-orbit-core"><img src="${group.icon}" alt="" /></div>
          ${group.nodes.map((node, nodeIndex) => `<span class="capability-node capability-node-${nodeIndex + 1}"><i></i>${node}</span>`).join("")}
        </div>
      </div>`;
    capabilityPanel.style.animation = "none";
    void capabilityPanel.offsetHeight;
    capabilityPanel.style.animation = "";
    if (focus) capabilityTabs[index]?.focus();
  }

  capabilityTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectCapability(index));
    tab.addEventListener("keydown", (event) => {
      let next = index;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % capabilityTabs.length;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + capabilityTabs.length) % capabilityTabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = capabilityTabs.length - 1;
      else return;
      event.preventDefault();
      selectCapability(next, true);
    });
  });

  const canvas = document.querySelector(".galaxy-canvas");
  const context = canvas?.getContext("2d");
  if (canvas && context) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const colors = ["236,238,255", "205,194,255", "167,140,255", "139,169,255", "255,225,194"];
    let width = 1;
    let height = 1;
    let maxRadius = 1;
    let stars = [];
    let animationFrame = 0;
    let seed = 0x0bdec7;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const buildGalaxy = () => {
      seed = 0x0bdec7;
      maxRadius = Math.min(width * 0.48, height * 0.47);
      const starCount = width < 560 ? 520 : 940;
      stars = Array.from({ length: starCount }, (_, index) => {
        const radius = Math.pow(random(), 0.72) * maxRadius;
        const normalized = radius / maxRadius;
        const inCore = index < starCount * 0.18;
        const arm = index % 4;
        const angle = inCore ? random() * Math.PI * 2 : arm * (Math.PI / 2) + normalized * 5.4 + (random() - 0.5) * (0.32 + normalized * 0.72);
        return {
          radius: inCore ? radius * 0.38 : radius,
          angle,
          speed: 0.000004 + (1 - normalized) * 0.000024,
          size: 0.35 + Math.pow(random(), 4) * 1.65,
          alpha: 0.24 + random() * 0.72,
          twinkle: 0.0007 + random() * 0.0014,
          phase: random() * Math.PI * 2,
          offset: (random() - 0.5) * (5 + normalized * 16),
          color: colors[Math.floor(random() * colors.length)],
        };
      });
    };
    const draw = (time) => {
      context.clearRect(0, 0, width, height);
      const centerX = width * 0.5;
      const centerY = height * 0.49;
      context.save();
      context.translate(centerX, centerY);
      context.scale(1, 0.64);
      const outerGlow = context.createRadialGradient(0, 0, maxRadius * 0.05, 0, 0, maxRadius);
      outerGlow.addColorStop(0, "rgba(237,232,255,0.18)");
      outerGlow.addColorStop(0.2, "rgba(132,95,255,0.12)");
      outerGlow.addColorStop(0.62, "rgba(72,48,157,0.045)");
      outerGlow.addColorStop(1, "rgba(7,8,14,0)");
      context.fillStyle = outerGlow;
      context.beginPath();
      context.arc(0, 0, maxRadius, 0, Math.PI * 2);
      context.fill();
      context.restore();
      context.save();
      context.globalCompositeOperation = "lighter";
      stars.forEach((star) => {
        const angle = star.angle + time * star.speed;
        const x = centerX + Math.cos(angle) * star.radius;
        const y = centerY + Math.sin(angle) * star.radius * 0.64 + star.offset;
        const flicker = 0.76 + Math.sin(time * star.twinkle + star.phase) * 0.24;
        context.fillStyle = `rgba(${star.color},${Math.max(0.08, star.alpha * flicker)})`;
        if (star.size < 1.15) context.fillRect(x, y, star.size, star.size);
        else {
          context.beginPath();
          context.arc(x, y, star.size, 0, Math.PI * 2);
          context.fill();
        }
      });
      context.restore();
      const core = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius * 0.18);
      core.addColorStop(0, "rgba(255,255,255,0.98)");
      core.addColorStop(0.12, "rgba(225,215,255,0.9)");
      core.addColorStop(0.42, "rgba(167,140,255,0.44)");
      core.addColorStop(1, "rgba(132,95,255,0)");
      context.fillStyle = core;
      context.beginPath();
      context.ellipse(centerX, centerY, maxRadius * 0.2, maxRadius * 0.105, -0.08, 0, Math.PI * 2);
      context.fill();
      if (!reducedMotion.matches && !document.hidden) animationFrame = window.requestAnimationFrame(draw);
    };
    const startGalaxy = () => {
      window.cancelAnimationFrame(animationFrame);
      if (reducedMotion.matches || document.hidden) draw(performance.now());
      else animationFrame = window.requestAnimationFrame(draw);
    };
    const resizeGalaxy = () => {
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      buildGalaxy();
      startGalaxy();
    };
    new ResizeObserver(resizeGalaxy).observe(canvas);
    reducedMotion.addEventListener("change", startGalaxy);
    document.addEventListener("visibilitychange", startGalaxy);
    resizeGalaxy();
  }

  const root = document.documentElement;
  const orbit = document.querySelector(".scroll-journey");
  root.classList.add("has-motion");

  function updateScroll() {
    const pageRange = Math.max(1, root.scrollHeight - window.innerHeight);
    root.style.setProperty("--page-progress", String(Math.min(1, Math.max(0, window.scrollY / pageRange))));
    if (!orbit) return;
    const rect = orbit.getBoundingClientRect();
    const range = Math.max(1, rect.height - window.innerHeight);
    const progress = Math.min(1, Math.max(0, -rect.top / range));
    const step = Math.min(2, Math.floor(progress * 3));
    const firstLeg = Math.min(1, progress * 2);
    const secondLeg = Math.min(1, Math.max(0, (progress - 0.5) * 2));
    const localProgress = progress <= 0.5 ? firstLeg : secondLeg;
    const eased = localProgress * localProgress * (3 - 2 * localProgress);
    const startX = progress <= 0.5 ? 16 : 50;
    const endX = progress <= 0.5 ? 50 : 84;
    const startY = progress <= 0.5 ? 76 : 47;
    const endY = progress <= 0.5 ? 47 : 18;
    orbit.style.setProperty("--journey-progress", String(progress));
    orbit.style.setProperty("--journey-x", `${startX + (endX - startX) * eased}%`);
    orbit.style.setProperty("--journey-y", `${startY + (endY - startY) * eased}%`);
    orbit.style.setProperty("--leg-one-clip", `${(1 - firstLeg) * 100}%`);
    orbit.style.setProperty("--leg-two-clip", `${(1 - secondLeg) * 100}%`);
    orbit.style.setProperty("--far-shift", `${progress * -42}px`);
    orbit.style.setProperty("--near-shift", `${progress * -105}px`);
    orbit.style.setProperty("--journey-zoom", String(1 + progress * 0.16));
    orbit.dataset.step = String(step);
  }

  let scrollFrame = 0;
  const requestScrollUpdate = () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(() => {
      updateScroll();
      scrollFrame = 0;
    });
  };
  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate);
  updateScroll();

  const revealItems = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.13 });
    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }
})();
