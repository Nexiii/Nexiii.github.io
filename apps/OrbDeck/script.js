(function () {
  "use strict";

  var navigation = document.getElementById("navigation");
  var menuButton = document.querySelector(".menu-button");
  var languageButtons = document.querySelectorAll("[data-language]");
  var translatedElements = document.querySelectorAll("[data-en][data-de]");
  var latestDownloadLinks = document.querySelectorAll("[data-latest-download]");
  var latestReleaseLinks = document.querySelectorAll("[data-latest-release]");
  var releaseLabel = document.querySelector("[data-release-label]");
  var releaseCopy = document.querySelector("[data-release-copy]");
  var releaseMeta = document.querySelector("[data-release-meta]");
  var releaseFooter = document.querySelector("[data-release-footer]");
  var downloadCount = document.querySelector("[data-download-count]");
  var checksumButton = document.querySelector(".checksum button");
  var checksum = document.querySelector(".checksum code");
  var currentLanguage = "en";
  var currentDownloadCount = 6;
  var bundledRelease = {
    version: "",
    downloadUrl: "https://github.com/Nexiii/OrbDeck/releases",
    releaseUrl: "https://github.com/Nexiii/OrbDeck/releases",
    size: null,
    checksum: null
  };
  var manifestUrl =
    "https://raw.githubusercontent.com/Nexiii/OrbDeck/main/latest.json";
  var releasesApiUrl =
    "https://api.github.com/repos/Nexiii/OrbDeck/releases?per_page=100";

  function setNavigationOpen(isOpen) {
    navigation.classList.toggle("open", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute(
      "aria-label",
      currentLanguage === "de"
        ? isOpen
          ? "Navigation schlie\u00dfen"
          : "Navigation \u00f6ffnen"
        : isOpen
          ? "Close navigation"
          : "Open navigation"
    );
  }

  function closeNavigation() {
    setNavigationOpen(false);
  }

  menuButton.addEventListener("click", function () {
    setNavigationOpen(!navigation.classList.contains("open"));
  });

  navigation.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", closeNavigation);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeNavigation();
  });

  document.addEventListener("click", function (event) {
    if (
      navigation.classList.contains("open") &&
      event.target instanceof Element &&
      !event.target.closest(".header")
    ) {
      closeNavigation();
    }
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth > 1120) closeNavigation();
  });

  function setLanguage(language) {
    currentLanguage = language;
    document.documentElement.lang = language;

    translatedElements.forEach(function (element) {
      element.textContent = element.getAttribute("data-" + language);
    });

    languageButtons.forEach(function (button) {
      var isActive = button.getAttribute("data-language") === language;
      button.classList.toggle("active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    setNavigationOpen(navigation.classList.contains("open"));

    document.title =
      language === "de"
        ? "OrbDeck — Kontrolle ohne neue Hardware."
        : "OrbDeck — Control without the hardware.";
    renderDownloadCount();
  }

  function renderDownloadCount() {
    if (!downloadCount) return;
    downloadCount.textContent = new Intl.NumberFormat(
      currentLanguage === "de" ? "de-DE" : "en-US"
    ).format(currentDownloadCount);
  }

  function updateDownloadCount() {
    try {
      var cachedCount = Number(
        window.localStorage.getItem("orbdeck-download-count")
      );
      if (Number.isSafeInteger(cachedCount) && cachedCount > currentDownloadCount) {
        currentDownloadCount = cachedCount;
        renderDownloadCount();
      }
    } catch (_) {
      // The bundled count remains available when storage is blocked.
    }

    fetch(releasesApiUrl, {
      cache: "no-store",
      headers: { Accept: "application/vnd.github+json" }
    })
      .then(function (response) {
        if (!response.ok) throw new Error("Release statistics are unavailable");
        return response.json();
      })
      .then(function (releases) {
        if (!Array.isArray(releases)) {
          throw new Error("Release statistics are incomplete");
        }
        var total = releases.reduce(function (releaseTotal, release) {
          if (release.draft || !Array.isArray(release.assets)) {
            return releaseTotal;
          }
          return (
            releaseTotal +
            release.assets.reduce(function (assetTotal, asset) {
              var isInstaller =
                asset &&
                asset.state === "uploaded" &&
                /^OrbDeck_.+_x64-setup\.exe$/i.test(String(asset.name || ""));
              var count = Number(asset && asset.download_count);
              return isInstaller && Number.isSafeInteger(count) && count >= 0
                ? assetTotal + count
                : assetTotal;
            }, 0)
          );
        }, 0);
        if (total < currentDownloadCount) return;
        currentDownloadCount = total;
        renderDownloadCount();
        try {
          window.localStorage.setItem(
            "orbdeck-download-count",
            String(currentDownloadCount)
          );
        } catch (_) {
          // The live counter still works when storage is blocked.
        }
      })
      .catch(function () {
        // Keep the last known count when GitHub is offline or rate-limited.
      });
  }

  languageButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setLanguage(button.getAttribute("data-language"));
    });
  });

  function normalizeVersion(value) {
    return String(value || "")
      .trim()
      .replace(/^v/i, "");
  }

  function versionParts(value) {
    var normalized = normalizeVersion(value);
    var match = normalized.match(
      /^(\d+)\.(\d+)(?:\.(\d+))?(?:-([a-z0-9.-]+))?$/i
    );
    if (!match) return null;
    return {
      major: Number(match[1]),
      minor: Number(match[2]),
      patch: Number(match[3] || 0),
      prerelease: match[4] || ""
    };
  }

  function compareVersions(left, right) {
    var a = versionParts(left);
    var b = versionParts(right);
    if (!a && !b) return 0;
    if (!a) return -1;
    if (!b) return 1;
    if (a.major !== b.major) return a.major - b.major;
    if (a.minor !== b.minor) return a.minor - b.minor;
    if (a.patch !== b.patch) return a.patch - b.patch;
    if (!a.prerelease && b.prerelease) return 1;
    if (a.prerelease && !b.prerelease) return -1;
    return a.prerelease.localeCompare(b.prerelease);
  }

  function displayVersion(value) {
    return normalizeVersion(value)
      .replace(/\.0-/, " ")
      .replace(/-/g, " ")
      .replace(/\b(beta|alpha|rc)\b/gi, function (word) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      });
  }

  function safeHttpsUrl(value, allowedHosts) {
    try {
      var parsed = new URL(value);
      if (
        parsed.protocol === "https:" &&
        allowedHosts.indexOf(parsed.hostname.toLowerCase()) !== -1
      ) {
        return parsed.href;
      }
    } catch (_) {
      return null;
    }
    return null;
  }

  function fetchManifestCandidate() {
    return fetch(manifestUrl + "?cache=" + Date.now(), {
      cache: "no-store"
    })
      .then(function (response) {
        if (!response.ok) throw new Error("Update manifest is unavailable");
        return response.json();
      })
      .then(function (manifest) {
        var platform =
          manifest.platforms && manifest.platforms["windows-x86_64"];
        var version = normalizeVersion(manifest.version);
        var downloadUrl = platform
          ? safeHttpsUrl(platform.url, [
              "github.com",
              "objects.githubusercontent.com"
            ])
          : null;
        if (!versionParts(version) || !downloadUrl) {
          throw new Error("Update manifest is incomplete");
        }
        var releaseUrl =
          "https://github.com/Nexiii/OrbDeck/releases/tag/v" +
          encodeURIComponent(version);
        var manifestChecksum = String(platform.sha256 || "").match(
          /^[A-Fa-f0-9]{64}$/
        );
        return {
          version: version,
          downloadUrl: downloadUrl,
          releaseUrl: releaseUrl,
          size: Number(platform.size) || null,
          checksum: manifestChecksum
            ? manifestChecksum[0].toUpperCase()
            : null,
          checksumUrl: downloadUrl + ".sha256"
        };
      });
  }

  function loadChecksum(candidate) {
    if (candidate.checksum) return Promise.resolve(candidate.checksum);
    if (!candidate.checksumUrl) return Promise.resolve(null);
    return fetch(candidate.checksumUrl, { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) return null;
        return response.text();
      })
      .then(function (text) {
        var match = String(text || "").match(/\b[A-Fa-f0-9]{64}\b/);
        return match ? match[0].toUpperCase() : null;
      })
      .catch(function () {
        return null;
      });
  }

  function applyRelease(candidate) {
    var version = candidate.version ? displayVersion(candidate.version) : "";
    if (candidate.downloadUrl) {
      latestDownloadLinks.forEach(function (link) {
        link.href = candidate.downloadUrl;
      });
    }
    if (candidate.releaseUrl) {
      latestReleaseLinks.forEach(function (link) {
        link.href = candidate.releaseUrl;
      });
    }
    if (releaseLabel && version) {
      releaseLabel.setAttribute(
        "data-en",
        "Version " + version + " is available"
      );
      releaseLabel.setAttribute(
        "data-de",
        "Version " + version + " ist verfügbar"
      );
    }
    if (releaseCopy && version) {
      releaseCopy.setAttribute(
        "data-en",
        "Download OrbDeck " +
          version +
          " and build your first command deck in minutes."
      );
      releaseCopy.setAttribute(
        "data-de",
        "Lade OrbDeck " +
          version +
          " und baue dein erstes Command Deck in wenigen Minuten."
      );
    }
    if (releaseMeta && candidate.size) {
      releaseMeta.textContent =
        "Windows 10/11 · x64 · " +
        (candidate.size / 1024 / 1024).toFixed(1) +
        " MB";
    }
    if (releaseFooter && version) {
      releaseFooter.textContent = "Early Access · " + version;
    }
    if (
      checksum &&
      normalizeVersion(candidate.version) !==
        normalizeVersion(bundledRelease.version) &&
      !candidate.checksum
    ) {
      checksum.textContent = "—";
    }
    loadChecksum(candidate).then(function (value) {
      if (value && checksum) checksum.textContent = value;
    });
    setLanguage(currentLanguage);
  }

  function withBundledFallback(candidate) {
    if (
      normalizeVersion(candidate.version) !==
      normalizeVersion(bundledRelease.version)
    ) {
      return candidate;
    }
    return Object.assign({}, bundledRelease, candidate);
  }

  function updateLatestRelease() {
    applyRelease(bundledRelease);
    fetchManifestCandidate()
      .then(function (candidate) {
        if (
          compareVersions(candidate.version, bundledRelease.version) >= 0
        ) {
          applyRelease(withBundledFallback(candidate));
        }
      })
      .catch(function () {
        // Keep the bundled release when GitHub is offline or rate-limited.
      });
  }

  function copyWithFallback(text) {
    var input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }

  checksumButton.addEventListener("click", function () {
    var text = checksum.textContent.trim();
    var copy = navigator.clipboard
      ? navigator.clipboard.writeText(text)
      : Promise.reject();

    copy.catch(function () {
      copyWithFallback(text);
    }).finally(function () {
      checksumButton.textContent =
        currentLanguage === "de" ? "Kopiert" : "Copied";
      window.setTimeout(function () {
        checksumButton.textContent =
          currentLanguage === "de" ? "Kopieren" : "Copy";
      }, 1600);
    });
  });

  setLanguage("en");
  updateLatestRelease();
  updateDownloadCount();
})();
