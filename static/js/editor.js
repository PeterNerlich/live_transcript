
const queryArgs = new URLSearchParams(window.location.search);
const socketURL = `${location.protocol.replace('http','ws')}//${queryArgs.get('debug') === null ? location.host+'/socket' : location.hostname+':8765'}`;

const availableLanguages = ["uk", "en", "ro", "de"];
const lang = queryArgs.get("lang") || "de";

const connectionQuality = document.getElementById("connection-quality");
const history = document.getElementById("transcript");
const todayMidnight = new Date();
todayMidnight.setHours(0,0,0,0);

const keyhints = new KeyHints(document.body.parentElement, document.querySelector("footer.keys"));

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
  return p;
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

function goToPreviousLine(e) {
  const focus = document.activeElement;
  const p = focus.closest('p[tid]');
  if (p && p.previousElementSibling) {
    p.previousElementSibling.querySelector('textarea').focus();
  }
  e.preventDefault();
}
function goToNextLine(e) {
  const focus = document.activeElement;
  const p = focus.closest('p[tid]');
  if (p && p.nextElementSibling) {
    p.nextElementSibling.querySelector('textarea').focus();
  }
  e.preventDefault();
}

function submitChanges(e) {
  const focus = document.activeElement;
  const p = focus.closest('p[tid]');
  if (focus && ["TEXTAREA", "INPUT"].includes(focus.nodeName)) {
    if (p) p.classList.add("pending");
    const tid = focus.name;
    const content = focus.value;
    const line = transcript.lines[tid];
    editor.change(tid, content).then(() => {
      const line = transcript.lines[tid];
      transcript.changeLine(line);
      if (p) p.classList.remove("changed", "pending");
    }).catch(() => {
      if (p) p.classList.remove("pending");
    });
    e.preventDefault();
  }
}

function discardChanges(e) {
  const focus = document.activeElement;
  const p = focus.closest('p[tid]');
  if (focus && ["TEXTAREA", "INPUT"].includes(focus.nodeName)) {
    const tid = focus.name;
    const line = transcript.lines[tid];
    focus.value = line.text;
    if (p) p.classList.remove("changed");
    setTimeout(updateSize.bind(focus), 0);
    setTimeout(updateLineStatus.bind(this, tid), 0);
    e.preventDefault();
  }
}

function lineBreak(e) {
  const focus = document.activeElement;
  if (focus && ["TEXTAREA", "INPUT"].includes(focus.nodeName)) {
    const tid = focus.name;
    focus.setRangeText("\n", focus.selectionStart, focus.selectionEnd, "end");
    enqueueUpdateLine({target: focus});
  }
  e.preventDefault();
}

function restartLine(e) {
  stt.restart();
  e.preventDefault();
}

function newManualLine(e) {
  const start = new Date();
  const end = start;
  const line = new Line({tid: new UUIDv4(), start: start, end: end, text: ""});
  calculateShouldScroll();
  const p = updateLine(line);
  scrollToBottom();
  const input = p.querySelector("textarea");
  if (input) input.focus();
  e.preventDefault();
  editor.submit(line.toJSON());
  transcript.addLine(line);
}

const enqueueUpdateLine = (debug => {
  let timeout = {};
  return e => {
    const focus = e.target;
    if (focus) {
      const tid = focus.name;
      if (tid && !timeout[tid]) {
        if (debug) console.log(`enqueueUpdateLine() for ${tid}`);
        timeout = window.setTimeout(() => {
          if (debug) console.log(`updating line ${tid} now`);
          updateSize.call(focus);
          updateLineStatus.call(focus, tid);
          delete timeout[tid];
        }, 0);
      } else if (debug) {
        console.log(`not enqueuing ${tid} again`);
      }
    } else if (debug) {
      console.log(`not enqueuing, no focus`);
    }
  };
})(false);

keyhints.addHint({key: "PageUp"}, goToPreviousLine, "PgUp", "Previous line", 10, true);
keyhints.addHint({key: "PageDown"}, goToNextLine, "PgDown", "Next line", 11, true);
keyhints.addHint({ctrlKey: false, shiftKey: false, key: "Enter"}, submitChanges, "⏎", "Submit changes", 20, true);
keyhints.addHint({ctrlKey: false, shiftKey: true, key: "Enter"}, lineBreak, "⇧+⏎", "New Line", 21, true);
keyhints.addHint({key: "Escape"}, discardChanges, "ESC", "Discard changes", 22, true);
keyhints.addHint({composed: true, ctrlKey: true, key: "l", type: "keydown"}, newManualLine, "CTRL+L", "Manually insert a new line now", 26, true);

keyhints.addHint({ctrlKey: false}, enqueueUpdateLine, "", "Update line", 30, true, true);

const {calculateShouldScroll, scrollToBottom} = setupStickyScroll(document.body.parentElement);

const editor = new WebsocketEditor(socketURL, "default", lang);
const transcript = new Transcript(null, lang);

//let start = session.start || new Date();
let start = new Date();

window.addEventListener("resize", e => {
  document.querySelectorAll("#transcript [tid] textarea").forEach(input => updateSize.call(input));
});

logAll(editor, "editor", ["pong"]);

editor.connect();

editor.subscribe("existing", msg => {
  const lines = JSON.parse(msg.lines);
  calculateShouldScroll();
  lines.forEach(line => {
    line = transcript.addOrUpdateLine(line);
    updateLine(line);
  });
  scrollToBottom();
});
editor.subscribe(["new", "changed"], msg => {
  const line = transcript.addOrUpdateLine(msg.line);
  calculateShouldScroll();
  updateLine(line);
  scrollToBottom();
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
