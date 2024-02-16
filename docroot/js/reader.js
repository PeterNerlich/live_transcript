
const socketURL = `${location.protocol.replace('http','ws')}//${location.search.substr(1).split("&").includes('debug') ? location.hostname+':8765' : location.host+'/socket'}`;

const html = document.body.parentElement;
const connectionQuality = document.getElementById("connection-quality");
const history = document.getElementById("history");
const recognition = document.getElementById("recognition");

function displayLine(line) {
  const p = document.createElement('p');
  p.setAttribute("tid", line.tid);
  p.setAttribute("original", line.text);
  p.innerText = line.text;
  history.appendChild(p);
}

function updateLine(tid, line) {
  const p = history.querySelector(`p[tid="${tid}"]`);
  if (p) {
    const original = p.getAttribute("original") || p.innerText;
    p.innerHTML = new Diff(original, line.text).html();
    p.setAttribute("tid", line.tid);
    p.classList.add("changed")
  }
}
const {calculateShouldScroll, scrollToBottom} = setupStickyScroll(document.body.parentElement);

const reader = new WebsocketReader(socketURL, "default", "uk");
const transcript = new Transcript(null, "uk");

logAll(reader, "reader", ["pong"]);

reader.subscribe("existing", msg => {
  const lines = JSON.parse(msg.lines);
  lines.forEach(displayLine);
  scrollToBottom(html);
});
reader.subscribe("new", msg => {
  calculateShouldScroll();
  displayLine(JSON.parse(msg.line));
  scrollToBottom(html);
});
reader.subscribe("changed", msg => {
  calculateShouldScroll();
  updateLine(msg.tid, JSON.parse(msg.line));
  scrollToBottom(html);
});

reader.connect();

reader.subscribe(["pong", "becomesUnhealthy"], () => {
  const ping = isNaN(reader.connectionCondition.pingAvg) ? "?" : Math.round(reader.connectionCondition.pingAvg);
  const classes = ["fast", "medium", "slow", "extremely-slow", "disconnected"];
  let current;
  if (reader.isHealthy()) {
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
  reader.connect();
});
