
const socketURL = `${location.protocol.replace('http','ws')}//${location.search.substr(1).split("&").includes('debug') ? location.hostname+':8765' : location.host+'/socket'}`;

const connectionQuality = document.getElementById("connection-quality");
const history = document.getElementById("transcript");
const recognition = document.getElementById("recognition");
const todayMidnight = new Date();
todayMidnight.setHours(0,0,0,0);

function displayLine(line) {
  const p = document.createElement('p');
  p.setAttribute("tid", line.tid);
  const label = document.createElement('label');
  const span = document.createElement('span');
  span.innerText = line.formatElapsedTime(todayMidnight, false);
  const i = document.createElement('i');
  const input = document.createElement('input');
  input.name = line.tid;
  input.value = line.text;
  i.appendChild(input);
  label.appendChild(span);
  label.appendChild(i);
  p.appendChild(label);
  history.appendChild(p);

  //input.addEventListener('change', updateLine);
  input.addEventListener('keydown', lineNav);
}

function lineNav(e) {
  const tid = e.target.name;
  const content = e.target.value;
  const line = transcript.lines[tid];
  const p = e.target.closest('p[tid]');

  if (content === line.text) p.classList.remove("changed");
  else p.classList.add("changed");

  if (!e.isComposing) {
    if (e.key == "Enter") {
      p.classList.add("pending");
      source.change(tid, content).then(() => {
        const line = transcript.changeLine(tid, content);
        p.classList.remove("changed", "pending");
      }).catch(() => {
        p.classList.remove("pending");
      });
    } else if (e.key == "Escape") {
      e.target.value = line.text;
      p.classList.remove("changed");
    } else if (e.key == "PageUp") {
      if (p.previousElementSibling !== null)
        p.previousElementSibling.querySelector('input').focus();
    } else if (e.key == "PageDown") {
      if (p.nextElementSibling !== null)
        p.nextElementSibling.querySelector('input').focus();
    } else {
      return;
    }
    e.preventDefault();
  }
}
/*
function updateLine(e) {
  const tid = e.target.name;
  const content = e.target.value;
  source.change(tid, content).then(() => {
    const line = transcript.changeLine(tid, content);
    console.log(line);
  })
}*/
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
  const line = new Line({tid: new UUIDv4(), start: start, end: end, text: out.map(x=>x.transcript).join('')});
  source.submit(line.toJSON());
  start = end;
  transcript.addLine(line);
  calculateShouldScroll();
  displayRecognition(out, true);

  displayLine(line);
  scrollToBottom();
});

logAll(stt, "stt");
logAll(source, "source", ["pong"]);

source.connect();
stt.begin();

source.subscribe("existing", msg => {
  const lines = JSON.parse(msg.lines);
  lines.forEach(line => {
    line = transcript.addLine(line);
    displayLine(line);
  });
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
  } else {
    current = "disconnected";
  }
  connectionQuality.classList.add(current);
  connectionQuality.classList.remove.apply(connectionQuality.classList, classes.filter(c => c !== current));
  connectionQuality.querySelector('span').innerText = `${ping} ms`;
});

connectionQuality.addEventListener("click", e => {
  source.connect();
});
