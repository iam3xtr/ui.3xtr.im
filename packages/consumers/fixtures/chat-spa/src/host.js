import { THEME_MODES } from "./theme.js";

// Host page: its own theme is unrelated to the framed app's theme.
const params = new URLSearchParams(location.search);
document.body.dataset.hostTheme = params.get("host") === "dark" ? "dark" : "light";

const theme = THEME_MODES.includes(params.get("theme")) ? params.get("theme") : "auto";
document.getElementById("chat-frame").src = `./index.html?embed=1&theme=${theme}`;
