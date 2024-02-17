
const socketURL = `${location.protocol.replace('http','ws')}//${location.search.substr(1).split("&").includes('debug') ? location.hostname+':8765' : location.host+'/socket'}`;

const connectionQuality = document.getElementById("connection-quality");
const history = document.getElementById("transcript");
const recognition = document.getElementById("recognition");
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
  lines.forEach(line => {
    const p = history.querySelector(`p[tid="${line.tid}"]`);
    history.appendChild(p);
  });
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
    source.change(tid, content).then(() => {
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
      recognition.appendChild(span)
    }
  }
  while (i < recognition.children.length) {
    recognition.removeChild(recognition.children[i]);
    i++;
  }
  if (final) {
    recognition.classList.add('final');
  } else {
    recognition.classList.remove('final');
  }
}

const stt = new SpeechToText();
const source = new WebsocketEditor(socketURL, "default", "de");
//const source = new WebsocketSource(`${location.protocol.replace('http','ws')}//${location.host}/socket`, "default", "de");
const transcript = new Transcript(null, "de");

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

document.addEventListener("keydown", e => {
  if (e.composed && e.ctrlKey && (e.key === "Enter" || e.key === "Space")) {
    stt.restart();
  }
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
  lines.forEach(line => {
    line = transcript.addOrUpdateLine(line);
    updateLine(line);
  });
  scrollToBottom();
});
source.subscribe(["new", "changed"], msg => {
  const line = transcript.addOrUpdateLine(msg.line);
  updateLine(line);
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
