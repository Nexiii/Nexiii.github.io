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
  var checksumButton = document.querySelector(".checksum button");
  var checksum = document.querySelector(".checksum code");
  var currentLanguage = "en";
  var bundledRelease = {
    version: "0.12.0-beta",
    downloadUrl:
      "https://github.com/Nexiii/OrbDeck/releases/download/v0.12.0-beta/OrbDeck_0.12.0-beta_x64-setup.exe",
    releaseUrl: "https://github.com/Nexiii/OrbDeck/releases/tag/v0.12.0-beta",
    size: 5142070,
    checksum:
      "45D7A009F0A7B1E99B791E4288D431CCF023D2F8DAD9DA475E86A65C3A1D20EC"
  };
  var manifestUrl =
    "https://raw.githubusercontent.com/Nexiii/OrbDeck/main/latest.json";

  function closeNavigation() {
    navigation.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  }

  menuButton.addEventListener("click", function () {
    var isOpen = navigation.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });

  navigation.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", closeNavigation);
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

    document.title =
      language === "de"
        ? "OrbDeck — Kontrolle ohne neue Hardware."
        : "OrbDeck — Control without the hardware.";
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
    var version = displayVersion(candidate.version);
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
    if (releaseLabel) {
      releaseLabel.setAttribute(
        "data-en",
        "Version " + version + " is available"
      );
      releaseLabel.setAttribute(
        "data-de",
        "Version " + version + " ist verfügbar"
      );
    }
    if (releaseCopy) {
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
    if (releaseFooter) {
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
})();
