
const queryArgs = new URLSearchParams(window.location.search);
const socketURL = `${location.protocol.replace('http','ws')}//${queryArgs.get('debug') === null ? location.host+'/socket' : location.hostname+':8765'}`;

const availableLanguages = ["uk", "en", "ro", "de"];
const lang = queryArgs.get("lang") || "de";

const connectionQuality = document.getElementById("connection-quality");
const history = document.getElementById("transcript");
const todayMidnight = new Date();
todayMidnight.setHours(0,0,0,0);

function updateLine(line) {
  let p = history.querySelector(`p[tid="${line.tid}"]`);
  let label, span, i, input;
  if (p === null) {
    p = document.createElement('p');
    p.setAttribute("tid", line.tid);
    label = document.createElement('label');
    span = document.createElement('span');
    input = document.createElement('textarea');
    input.name = line.tid;
    label.appendChild(span);
    label.appendChild(input);
    p.appendChild(label);
    history.appendChild(p);

    setTimeout(updateSize.bind(input), 0);
    //input.addEventListener('change', updateLine);
    input.addEventListener('keydown', lineNav);

  } else {
    label = p.querySelector('label');
    span = label.querySelector('span');
    input = label.querySelector('textarea');
  }

  span.innerText = line.formatElapsedTime(todayMidnight, false);
  if (p.classList.contains('changed')) {
    // don't overwrite unsubmitted changes
    if (input.value == line.text) {
      p.classList.remove('changed');
    }
  } else {
    input.value = line.text;
  }
}
function sortLines(lines) {
  const ps = Array.from(history.children);
  const indices = Object.fromEntries(lines.map((l, i) => [l.tid, i]));
  ps.sort((a,b) => indices[a.getAttribute("tid")] - indices[b.getAttribute("tid")]);
  history.replaceChildren.apply(history, ps);
}
function updateLineStatus(tid) {
  const p = history.querySelector(`p[tid="${tid}"]`);
  const content = p.querySelector('textarea').value;
  const line = transcript.lines[tid];
  if (content == line.text) {
    p.classList.remove("changed");
  } else if (!p.classList.contains("pending")) {
    p.classList.add("changed");
  }
}
function updateSize() {
  this.style.height = 0;
  this.style.height = `${this.scrollHeight}px`;
}

function lineNav(e) {
  const tid = e.target.name;
  const content = e.target.value;
  const line = transcript.lines[tid];
  const p = e.target.closest('p[tid]');
  setTimeout(updateSize.bind(e.target), 0);
  setTimeout(updateLineStatus.bind(this, tid), 0);

  if (e.key == "Enter" && !e.shiftKey && !e.ctrlKey) {
    p.classList.add("pending");
    editor.change(tid, content).then(() => {
      const line = transcript.lines[tid];
      transcript.changeLine(line);
      p.classList.remove("changed", "pending");
    }).catch(() => {
      p.classList.remove("pending");
    });
  } else if (e.key == "Escape") {
    e.target.value = line.text;
    p.classList.remove("changed");
    console.log(`lineNav(Escape) '${content}',  '${line.text}'`);
  } else if (e.key == "PageUp") {
    if (p.previousElementSibling !== null)
      p.previousElementSibling.querySelector('textarea').focus();
  } else if (e.key == "PageDown") {
    if (p.nextElementSibling !== null)
      p.nextElementSibling.querySelector('textarea').focus();
  } else {
    return;
  }
  e.preventDefault();
}

const {calculateShouldScroll, scrollToBottom} = setupStickyScroll(document.body.parentElement);

const editor = new WebsocketEditor(socketURL, "default", lang);
const transcript = new Transcript(null, lang);

//let start = session.start || new Date();
let start = new Date();

document.addEventListener("keydown", e => {
  if (e.composed && e.ctrlKey && (e.key === "Enter" || e.key === "Space")) {
    stt.restart();
  }
});
window.addEventListener("resize", e => {
  document.querySelectorAll("#transcript [tid] textarea").forEach(input => updateSize.call(input));
});

logAll(editor, "editor", ["pong"]);

editor.connect();

editor.subscribe("existing", msg => {
  const lines = JSON.parse(msg.lines);
  lines.forEach(line => {
    line = transcript.addOrUpdateLine(line);
    updateLine(line);
  });
  scrollToBottom();
});
editor.subscribe(["new", "changed"], msg => {
  const line = transcript.addOrUpdateLine(msg.line);
  updateLine(line);
});
editor.subscribe(["pong", "becomesUnhealthy"], () => {
  const ping = isNaN(editor.connectionCondition.pingAvg) ? "?" : Math.round(editor.connectionCondition.pingAvg);
  const classes = ["fast", "medium", "slow", "extremely-slow", "disconnected"];
  let current;
  if (editor.isHealthy()) {
    if (ping < 500) current = "fast";
    else if (ping < 1500) current = "medium";
    else if (ping < 3000) current = "slow";
    else current = "extremely-slow";
    document.body.classList.remove("error", "refreshing");
  } else {
    current = "disconnected";
    document.body.classList.add("error");
  }
  connectionQuality.classList.add(current);
  connectionQuality.classList.remove.apply(connectionQuality.classList, classes.filter(c => c !== current));
  connectionQuality.querySelector('span').innerText = `${ping} ms`;
});

connectionQuality.addEventListener("click", e => {
  editor.connect();
  document.body.classList.add("refreshing");
});

displayClientVersion();
editor.subscribe("version", displayServerVersion);
