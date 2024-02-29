
const queryArgs = new URLSearchParams(window.location.search);
const socketURL = `${location.protocol.replace('http','ws')}//${queryArgs.get('debug') === null ? location.host+'/socket' : location.hostname+':8765'}`;

const availableLanguages = ["uk", "en", "ro", "de"];
const lang = queryArgs.get("lang") || "uk";

const html = document.body.parentElement;
const connectionQuality = document.getElementById("connection-quality");
const history = document.getElementById("history");
const recognition = document.getElementById("recognition");

function updateLine(line) {
  let p = history.querySelector(`p[tid="${line.tid}"]`);
  if (p === null) {
    p = document.createElement('p');
    p.setAttribute("tid", line.tid);
    p.setAttribute("original", line.text);
    history.appendChild(p);
    p.innerText = line.text;

  } else {
    const original = p.getAttribute("original") || p.innerText;
    p.innerHTML = new Diff(original, line.text).html((x, tag) => {
      if (['insert', 'replace'].includes(tag)) {
        return x.replaceAll('\n', '⏎<br>');
      } else if (tag == 'delete') {
        return `<i>${x.replaceAll('\n', '⏎')}</i>`;
      } else {
        return x.replaceAll('\n', '<br>');
      }
    });
    p.querySelectorAll('.delete i').forEach(i => {
      i.parentElement.style.width = `calc(${.5 * i.scrollWidth}px - .1em)`;
    });
    p.setAttribute("tid", line.tid);
    p.classList.add("changed");
  }
  return p;
}
function sortLines(lines) {
  lines.forEach(line => {
    const p = history.querySelector(`p[tid="${line.tid}"]`);
    history.appendChild(p);
  });
}
const {calculateShouldScroll, scrollToBottom} = setupStickyScroll(document.body.parentElement);

const reader = new WebsocketReader(socketURL, "default", lang);
const transcript = new Transcript(null, lang);

logAll(reader, "reader", ["pong"]);

reader.subscribe("existing", msg => {
  const lines = JSON.parse(msg.lines);
  calculateShouldScroll();
  lines.forEach(transcript.addOrUpdateLine.bind(transcript));
  sortLines(transcript.linesSorted());
  scrollToBottom();
});
reader.subscribe(["new", "changed"], msg => {
  transcript.addOrUpdateLine(msg.line);
});

transcript.subscribe("new", line => {
  calculateShouldScroll();
  updateLine(line);
  //sortLines(transcript.linesSorted());
  scrollToBottom();
});
transcript.subscribe("changed", line => {
  let shouldScroll = calculateShouldScroll();
  console.log(`transcript line changed: ${shouldScroll}`);
  updateLine(line);
  sortLines(transcript.linesSorted());
  scrollToBottom();
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
  reader.connect();
  document.body.classList.add("refreshing");
});

displayClientVersion();
reader.subscribe("version", displayServerVersion);


const languageDiv = document.getElementById("language");
const iCurrentLanguage = languageDiv.querySelector('i');
const ulLangs = languageDiv.querySelector('ul');

iCurrentLanguage.innerText = lang.toUpperCase();

availableLanguages.forEach(l => {
  if (l == lang) return;

  const li = document.createElement("li");
  const i = document.createElement("i");
  i.innerText = l.toUpperCase();
  li.appendChild(i);
  ulLangs.appendChild(li);

  li.addEventListener("click", () => {
    queryArgs.set("lang", l);
    location.search = `?${queryArgs.toString()}`;
  });
});
