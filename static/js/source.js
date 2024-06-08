
const queryArgs = new URLSearchParams(window.location.search);
const socketURL = `${location.protocol.replace('http','ws')}//${queryArgs.get('debug') === null ? location.host+'/socket' : location.hostname+':8765'}`;

const availableLanguages = ["uk", "en", "ro", "de"];
const lang = queryArgs.get("lang") || "de";

const connectionQuality = document.getElementById("connection-quality");
const history = document.getElementById("transcript");
const recognition = document.getElementById("recognition");
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

  } else {
    label = p.querySelector('label');
    span = label.querySelector('span');
    input = label.querySelector('textarea');
  }

  setTimeout(updateSize.bind(input), 0);

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
    source.change(tid, content).then(() => {
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
  source.submit(line.toJSON());
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
keyhints.addHint({ctrlKey: false, shiftKey: true, key: "Enter"}, lineBreak, "⇧+⏎", "Line break", 21, true);
keyhints.addHint({key: "Escape"}, discardChanges, "ESC", "Discard changes", 22, true);
const ctrlEnter = keyhints.addHint({composed: true, ctrlKey: true, key: "Enter", type: "keydown"}, restartLine, "CTRL+⏎", "Force recognition to start new line", 24, true);

function stopRecognition(e) {
  stt.stop();
  ctrlEnter.description = "Resume recognition";
  keyhints.queueUpdateLegend();
  const restartIndicator = document.querySelector('footer.keys [data-display="CTRL+⏎"]');
  restartIndicator.classList.add('alert');
}

ctrlEnter.fn = e => {
  restartLine(e);
  ctrlEnter.description = "Force recognition to start new line";
  keyhints.queueUpdateLegend();
  const restartIndicator = document.querySelector('footer.keys [data-display="CTRL+⏎"]');
  restartIndicator.classList.remove('alert');
};

keyhints.addHint({composed: true, ctrlKey: true, code: "Space", type: "keydown"}, stopRecognition, "CTRL+SPACE", "Pause recognition", 24, true);
keyhints.addHint({composed: true, ctrlKey: true, key: "l", type: "keydown"}, newManualLine, "CTRL+L", "Manually insert a new line now", 26, true);

keyhints.addHint({ctrlKey: false}, enqueueUpdateLine, "", "Update line", 30, true, true);

const {calculateShouldScroll, scrollToBottom} = setupStickyScroll(document.body.parentElement);

function displayRecognition(results, final) {
  let i;
  for (i = 0; i < results.length; i++) {
    if (i < recognition.children.length) {
      recognition.children[i].innerText = results[i].transcript;
      recognition.children[i].style.opacity = results[i].confidence * .5 + .5;
    } else {
      let span = document.createElement('span');
      span.innerText = results[i].transcript;
      span.style.opacity = results[i].confidence * .5 + .5;
      recognition.appendChild(span);
    }
  }
  while (i < recognition.children.length) {
    recognition.removeChild(recognition.children[i]);
    i++;
  }
  const restartIndicator = document.querySelector('footer.keys [data-display="CTRL+⏎"]');
  if (final) {
    recognition.classList.add('final');
    recognition.classList.remove("long");
    if (restartIndicator) restartIndicator.classList.remove("alert");
  } else {
    recognition.classList.remove('final');
    if (recognition.innerText.length > 200) {
      recognition.classList.add("long");
      if (restartIndicator) restartIndicator.classList.add("alert");
    } else {
      recognition.classList.remove("long");
      if (restartIndicator) restartIndicator.classList.remove("alert");
    }
  }
}

const stt = new SpeechToText(lang);
const source = new WebsocketEditor(socketURL, "default", lang);
const transcript = new Transcript(null, lang);

stt.subscribe("stop", () => {
  if (!recognition.classList.contains('final')) {
    recognition.innerText = "";
  }
});

//let start = session.start || new Date();
let start = new Date();
stt.subscribe("speechStart", () => start = new Date());

stt.subscribe("intermediates", intermediates => {
  const out = [];
  for (let i = 0; i < intermediates.length; i++) {
    let best = intermediates[i][0];
    for (let a = 0; a < intermediates[i].length; a++) {
      if (intermediates[i][a].confidence > best.confidence) {
        best = intermediates[i][a];
      }
    }
    out.push(best);
  }
  calculateShouldScroll();
  displayRecognition(out, false);
  scrollToBottom();
});

stt.subscribe("results", results => {
  let end = new Date();
  const out = [];
  for (let r = 0; r < results.length; r++) {
    let best = results[r][0];
    for (let a = 0; a < results[r].length; a++) {
      if (results[r][a].confidence > best.confidence) {
        best = results[r][a];
      }
    }
    out.push(best);
  }
  calculateShouldScroll();
  displayRecognition(out, true);

  const text = out.map(x=>x.transcript).join('').trim();
  if (text) {
    const line = new Line({tid: new UUIDv4(), start: start, end: end, text: text});
    source.submit(line.toJSON());
    start = end;
    transcript.addLine(line);
    updateLine(line);
  }
  scrollToBottom();
});

window.addEventListener("resize", e => {
  document.querySelectorAll("#transcript [tid] textarea").forEach(input => updateSize.call(input));
});

logAll(stt, "stt");
logAll(source, "source", ["pong"]);

source.connect();
stt.begin();

source.subscribe("existing", msg => {
  const lines = JSON.parse(msg.lines);
  calculateShouldScroll();
  lines.forEach(line => {
    line = transcript.addOrUpdateLine(line);
    updateLine(line);
  });
  scrollToBottom();
});
source.subscribe(["new", "changed"], msg => {
  const line = transcript.addOrUpdateLine(msg.line);
  calculateShouldScroll();
  updateLine(line);
  scrollToBottom();
});
source.subscribe(["pong", "becomesUnhealthy"], () => {
  const ping = isNaN(source.connectionCondition.pingAvg) ? "?" : Math.round(source.connectionCondition.pingAvg);
  const classes = ["fast", "medium", "slow", "extremely-slow", "disconnected"];
  let current;
  if (source.isHealthy()) {
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
  source.connect();
  document.body.classList.add("refreshing");
});

displayClientVersion();
source.subscribe("version", displayServerVersion);
