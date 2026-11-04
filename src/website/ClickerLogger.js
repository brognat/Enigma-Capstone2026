// Keeps track of every click on the page so we can look at it later
const ClickLogger = (() => {
  const STORAGE_KEY = "clickLog";
  // Grab any old clicks from localStorage so a refresh doesn't wipe them
  let clicks = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

  // Turns an element into something readable, like "button#start.big"
  function describeTarget(el) {
    let desc = el.tagName.toLowerCase();
    if (el.id) desc += `#${el.id}`;
    if (el.classList.length) desc += "." + [...el.classList].join(".");
    return desc;
  }

  // Runs on every click and saves the useful bits
  function record(event) {
    const entry = {
      time: new Date().toISOString(),
      button: ["left", "middle", "right"][event.button] ?? event.button,
      x: event.pageX,
      y: event.pageY,
      target: describeTarget(event.target),
      text: (event.target.textContent || "").trim().slice(0, 50),
    };
    clicks.push(entry);
    // Save right away in case the tab gets closed
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clicks));
  }

  // Hands back a copy so nobody messes with the real list by accident
  function getClicks() {
    return [...clicks];
  }

  // Fresh start - wipes everything
  function clear() {
    clicks = [];
    localStorage.removeItem(STORAGE_KEY);
  }

  // Saves the log as a file (txt by default, but csv and json work too)
  function download(format = "txt") {
    let data,
      type,
      filename = `clicks.${format}`;
    if (format === "txt") {
      data = clicks
        .map(
          (c) =>
            `[${c.time}] ${c.button} click at (${c.x}, ${c.y}) on ${c.target}${c.text ? ` "${c.text}"` : ""}`,
        )
        .join("\n");
      type = "text/plain";
      filename = "transcripttest.txt";
    } else if (format === "csv") {
      const headers = ["time", "button", "x", "y", "target", "text"];
      const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
      data = [
        headers.join(","),
        ...clicks.map((c) => headers.map((h) => escape(c[h])).join(",")),
      ].join("\n");
      type = "text/csv";
    } else {
      data = JSON.stringify(clicks, null, 2);
      type = "application/json";
    }
    // make a fake link and "click" it to trigger the download
    const url = URL.createObjectURL(new Blob([data], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Listening in the capture phase so we still catch clicks even if something else tries to block them
  // (auxclick is for middle/right clicks)
  document.addEventListener("click", record, true);
  document.addEventListener("auxclick", record, true);

  document.querySelectorAll("[data-export-clicks]").forEach((button) => {
    button.addEventListener("click", () => download());
  });

  // These are the only things you can call from outside, e.g. ClickLogger.download()
  return { getClicks, clear, download };
})();
