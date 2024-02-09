
class Session {
	constructor(json, name, start, uuid) {
		if (!json) {
			// new session
			this.date = start || new Date();
			this.name = name || this.date.toISOString();
			this.uuid = uuid || new UUIDv4();
			this.transcripts = {};
		} else {}
	}

	addTranscript(json, language) {
		let transcript;
		if (json instanceof Transcript) {
			transcript = json;
		} else {
			transcript = new Transcript(json);
		}
		transcript.timeOffset = this.date;
		language = language || transcript.language;
		this.transcripts[language] = transcript;
	}
}


class Transcript {
	constructor(json, language, timeOffset) {
		if (!json) {
			this.language = language;
			this.lines = {};
			this.timeOffset = timeOffset || 0;
		} else {}

		this.eventListeners = {
			new: [],
			changed: [],
			deleted: [],
		};
	}

	addLine(json, start, end, text) {
		let line;
		if (json instanceof Line) {
			line = json;
		} else {
			line = new Line(json, start, end, text);
		}
		this.lines[line.tid] = line;
		this.handleEvent("new", line);
		return line;
	}

	removeLine(tid) {
		const line = this.lines[tid];
		if (line) {
			delete this.lines[tid];
			this.handleEvent("deleted", line);
		}
		return line;
	}

	changeLine(tid, content) {
		const line = this.lines[tid];
		if (line) {
			line.text = content;
			this.handleEvent("changed", line);
		}
		return line;
	}

	splitLine(tid, position) {
		const line = this.lines[tid];
		if (line) {
			const frac = position / line.text.length;
			if (frac >= 1 || frac <= 0) throw new Error(`fraction ${frac} outside (0..1)`);
			const mid = (line.end - line.start) * frac + line.start;
			const dup = line.duplicate();
			line.text = line.text.slice(0, position).trim();
			dup.text = dup.text.slice(position, dup.text.length).trim();
			line.end = mid;
			dup.start = mid;
			this.lines[dup.tid] = dup;
			this.handleEvent("split", [line, dup]);
			return [line, dup];
		}
		return [];
	}

	mergeLines(tid_one, tid_two) {
		const one = this.lines[tid_one];
		const two = this.lines[tid_two];
		let merged = null;
		if (one && two) {
			merged = one.duplicate();
			merged.text += ` ${two.text}`;
			merged.start = one.start < two.start ? one.start : two.start;
			merged.end = one.end > two.end ? one.end : two.end;
			merged.previouslyAssociatedTids.add(two.tid);
			two.previouslyAssociatedTids.forEach(tid => {
				merged.previouslyAssociatedTids.add(tid);
			});
			this.handleEvent("merged", merged);
		}
		return merged;
	}

	linesSorted() {
		return this.lines.values().toSorted((a, b) => a.start !== b.start ? a.start - b.start : a.end - b.end);
	}


	subscribe(events, listener) {
		if (typeof events === "string") events = [events];
		if (typeof listener !== "function") throw new Error("Listener is not a function!");
		events.forEach(event => {
			if (event in this.eventListeners) {
				this.eventListeners[event].push(listener);
			} else {
				console.warn(`Event ${event} unknown and cannot be subscribed to`);
			}
		});
	}
	unsubscribe(events, listener) {
		if (typeof events === "string") events = [events];
		events.forEach(event => {
			if (event in this.eventListeners) {
				const list = this.eventListeners[event]
				list.splice(list.indexOf(listener), 1);
			} else {
				console.warn(`Event ${event} unknown and cannot be unsubscribed from`);
			}
		});
	}

	handleEvent(event, data) {
		if (event in this.eventListeners) {
			this.eventListeners[event].forEach(handler => {
				if (typeof handler === "function") {
					handler(data);
				}
			});
		} else {
			console.error(`Cannot handle unknown event ${event}!`);
		}
	}

	toText() {
		return this.linesSorted().map(line => line.text).join("\n");
	}
	toSRT() {
		let output = "";
		this.linesSorted().forEach((line, i) => {
			output += `${i+1}\n`;
			output += `${line.formatElapsedTime(this.timeOffset, false)}\n`;
			output += `${this.lines[i].text}\n\n`;
		});
		return output;
	}
	toWebVTT() {
		let output = "WEBVTT\n\n";
		this.linesSorted().forEach((line, i) => {
			output += `${i+1}\n`;
			output += `${line.formatElapsedTime(this.timeOffset, true)}\n`;
			output += `${this.lines[i].text}\n\n`;
		});
		return output;
	}
}


class Line {
	constructor(json, start, end, text, tid, previouslyAssociatedTids) {
		if (!json) {
			this.start = new Date(start);
			this.end = new Date(end);
			this.text = text || "";
			this.tid = tid || new UUIDv4();
			this.uuid = uuid || new UUIDv4();
			this.previouslyAssociatedTids = new Set(previouslyAssociatedTids);
		} else {
			if (typeof json === "string") json = JSON.parse(json);
			this.start = new Date(json.start);
			this.end = new Date(json.end);
			this.text = json.text;
			this.tid = json.tid;
			this.uuid = json.uuid;
			this.previouslyAssociatedTids = new Set(json.previously_associated_tids);
		}
	}

	toJSON() {
		return JSON.stringify({
			tid: this.tid,
			start: this.start,
			end: this.end,
			text: this.text,
			previously_associated_tids: Array.from(this.previouslyAssociatedTids),
		});
	}

	duplicate() {
		return new Line(
			this.start,
			this.end,
			this.text,
			null,
			this.previouslyAssociatedTids.union([this.tid]),
		);
	}

	formatElapsedTime(timeOffset, useDot) {
		timeOffset = timeOffset || 0;
		return `${this.formatTime(this.start - timeOffset, useDot)} --> ${this.formatTime(this.end - timeOffset, useDot)}`;
	}
	formatTime(time, useDot) {
		let seconds = Math.floor(time/1000);
		const milliseconds = time - (seconds * 1000);
		let minutes = Math.floor(seconds/60);
		let hours = Math.floor(minutes/60);
		const days = Math.floor(hours/24);

		const millisecondsSeparator = useDot ? "." : ",";

		hours = hours-(days*24);
		minutes = minutes-(days*24*60)-(hours*60);
		seconds = seconds-(days*24*60*60)-(hours*60*60)-(minutes*60);

		return ((hours < 10) ? '0' : '') + hours + 
			((minutes < 10) ? ':0' : ':') + minutes  + 
			((seconds < 10) ? ':0' : ':') + seconds + 
			millisecondsSeparator + String(milliseconds).padStart(3,'0');
	}
}
