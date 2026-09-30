const desktop = window.pharmaDesktop;

const pageNames = {
  dashboard: "Dashboard",
  medicines: "Medicines Search",
  inventory: "Inventory",
  updates: "Updates",
};

const navLinks = [...document.querySelectorAll("[data-page-link]")];
const pages = [...document.querySelectorAll("[data-page]")];
const versionLabels = [...document.querySelectorAll("[data-app-version]")];
const updateLabels = [...document.querySelectorAll("[data-update-message]")];
const updateBadges = [...document.querySelectorAll("[data-update-badge]")];
const progressBars = [...document.querySelectorAll("[data-update-progress]")];
const progressLabels = [...document.querySelectorAll("[data-progress-label]")];
const restartButtons = [...document.querySelectorAll("[data-install-update]")];

function showPage(pageId) {
  const selectedPage = pageNames[pageId] ? pageId : "dashboard";

  pages.forEach((page) => {
    page.hidden = page.dataset.page !== selectedPage;
  });

  navLinks.forEach((link) => {
    const active = link.dataset.pageLink === selectedPage;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  document.querySelector("[data-current-page]").textContent = pageNames[selectedPage];
}

function setAppVersion(version) {
  const label = version ? `v${version}` : "Unavailable";
  versionLabels.forEach((element) => {
    element.textContent = label;
  });
}

function updateStatus(status = {}) {
  const state = status.state ?? "checking";
  const message = status.message ?? "Checking for updates...";
  const percent = Math.max(0, Math.min(100, Number(status.percent) || 0));
  const badgeText = {
    checking: "Checking",
    available: "Available",
    downloading: `${percent}%`,
    downloaded: "Ready to restart",
    "up-to-date": "Up to date",
    offline: "Offline",
    error: "Unavailable",
    development: "Development",
  }[state] ?? "Status";

  updateLabels.forEach((element) => {
    element.textContent = message;
  });
  updateBadges.forEach((element) => {
    element.textContent = badgeText;
    element.dataset.state = state;
  });
  progressBars.forEach((element) => {
    element.value = percent;
    element.closest(".progress-wrap").hidden = state !== "downloading";
  });
  progressLabels.forEach((element) => {
    element.textContent = `${percent}%`;
  });
  restartButtons.forEach((button) => {
    button.hidden = state !== "downloaded";
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    showPage(link.dataset.pageLink);
    history.replaceState(null, "", `#${link.dataset.pageLink}`);
  });
});

document.querySelectorAll("[data-go-page]").forEach((button) => {
  button.addEventListener("click", () => {
    const pageId = button.dataset.goPage;
    showPage(pageId);
    history.replaceState(null, "", `#${pageId}`);
  });
});

restartButtons.forEach((button) => {
  button.addEventListener("click", () => desktop?.installUpdate());
});

const greeting = document.querySelector("[data-greeting]");
if (greeting) {
  const hour = new Date().getHours();
  greeting.textContent = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

document.querySelector("[data-today]").textContent = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
}).format(new Date());

showPage(location.hash.slice(1));
setAppVersion("");
updateStatus({ state: "checking", message: "Connecting to the update service...", percent: 0 });

if (desktop) {
  desktop.getVersion().then(setAppVersion).catch(() => setAppVersion(""));
  desktop.getUpdateStatus().then(updateStatus).catch(() => {});
  desktop.onUpdateStatus(updateStatus);
} else {
  updateStatus({ state: "development", message: "Desktop update service is unavailable in this preview.", percent: 0 });
}