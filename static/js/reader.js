
const queryArgs = new URLSearchParams(window.location.search);
const socketURL = `${location.protocol.replace('http','ws')}//${queryArgs.get('debug') === null ? location.host+'/socket' : location.hostname+':8765'}`;

const availableLanguages = ["uk", "en", "ro", "de"];
const lang = queryArgs.get("lang") || "uk";

const html = document.body.parentElement;
const connectionQuality = document.getElementById("connection-quality");
const history = document.getElementById("history");
const recognition = document.getElementById("recognition");

if (!hasCSSPow) html.classList.add("no-css-pow");

function updateLine(line) {
  let p = history.querySelector(`p[tid="${line.tid}"]`);
  if (p === null) {
    p = document.createElement('p');
    p.setAttribute("tid", line.tid);
    p.setAttribute("original", line.text);
    history.appendChild(p);
    p.innerText = line.text;

  } else {
    const original = (o => o === null ? p.innerText : o)(p.getAttribute("original"));
    p.innerHTML = wordDiff(original, line.text).html((x, tag) => {
      x = x.join("");
      if (['insert', 'replace'].includes(tag)) {
        // only replace leading and trailing newlines with ⏎
        const segments = x.match(/(\s+|[^\s]+)/g) || [];
        for ([i, seg] of segments.entries()) {
          if (i == 0 || i == segments.length - 1) {
            segments[i] = segments[i].replaceAll('\n', '⏎<br>');
          } else {
            segments[i] = segments[i].replaceAll('\n', '<br>');
          }
        }
        return segments.join("");
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
  const start = Date.now();
  const ps = Array.from(history.children);
  const indices = Object.fromEntries(lines.map((l, i) => [l.tid, i]));
  ps.sort((a,b) => indices[a.getAttribute("tid")] - indices[b.getAttribute("tid")]);
  history.replaceChildren.apply(history, ps);
  const split = Date.now();
  let prev = null;
  const histStyle = getComputedStyle(history);
  const maxSeconds = histStyle.getPropertyValue("--max-seconds");
  const curveExponent = histStyle.getPropertyValue("--curve-exponent");
  ps.forEach((p, i) => {
    const line = lines[i];
    if (prev !== null) {
      const pause = Math.max(line.start - prev.end, 0) / 1000;
      p.style.setProperty("--pause-before", pause);
      if (!hasCSSPow) {
        const fallback = Math.pow(1 - pause / maxSeconds, curveExponent);
        p.style.setProperty("--pause-pow-value", fallback);
      }
    }
    prev = line;
  });
  const end = Date.now();
  console.log(`sortLines(#${lines.length}) took ${(end-start)/1000} s, ${(end-split)/1000} s of it to set --pause-before (${(end-split)/(end-start)*100} %)`);
}

const enqueueSortLines = (debug => {
  let queued = false;
  let promise = null;
  return lines => {
    queued = lines; // update queued in any case
    if (!promise) {
      if (debug) console.log(`enqueueSortLines()`);
      promise = new Promise((res, rej) => {
        window.requestAnimationFrame(timestamp => {
          if (debug) console.log(`sorting lines now`);
          sortLines(queued);
          queued = false;
          promise = null; // clear promise
          res({
            timestamp: timestamp,
            sorted: queued,
          });
        });
      });
    } else if (debug) {
      console.log(`not queuing sortLines again`);
    }
    return promise;
  };
})(false);
const {calculateShouldScroll, scrollToBottom} = setupStickyScroll(document.body.parentElement);

const enqueueScrollToBottom = (debug => {
  let last = -1;
  return ({timestamp, sorted}) => {
    if (timestamp > last) {
      if (debug) console.log(`enqueueSortLines({ts: ${JSON.stringify(timestamp)}}) sorting now!`);
      scrollToBottom();
      last = timestamp;
    } else {
      if (debug) console.log(`enqueueSortLines({ts: ${JSON.stringify(timestamp)}}) already sorted`);
    }
  };
})(false);

const reader = new WebsocketReader(socketURL, "default", lang);
const transcript = new Transcript(null, lang);

logAll(reader, "reader", ["pong"]);

let blockCalculateShouldScroll = false;
reader.subscribe("existing", msg => {
  const lines = JSON.parse(msg.lines);
  calculateShouldScroll();
  blockCalculateShouldScroll = true;
  lines.forEach(transcript.addOrUpdateLine.bind(transcript));
  enqueueSortLines(transcript.linesSorted())
    .then(enqueueScrollToBottom)
    .then(() => {
      blockCalculateShouldScroll = false;
    });
});
reader.subscribe(["new", "changed"], msg => {
  transcript.addOrUpdateLine(msg.line);
});

transcript.subscribe("new", line => {
  if (!blockCalculateShouldScroll) calculateShouldScroll();
  updateLine(line);
  enqueueSortLines(transcript.linesSorted())
    .then(enqueueScrollToBottom);
});
transcript.subscribe("changed", line => {
  if (!blockCalculateShouldScroll) calculateShouldScroll();
  updateLine(line);
  enqueueSortLines(transcript.linesSorted())
    .then(enqueueScrollToBottom);
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
  if (reader.connectionCondition.lastSuccessfulPing && Date.now() - reader.connectionCondition.lastSuccessfulPing >= 5000) {
    if (reader.socket) reader.socket.close();
    reader.socket = null;
  }
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
