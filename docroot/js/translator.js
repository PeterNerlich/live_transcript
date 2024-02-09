
class Translator {
	constructor(sourceTranscript, targetTranscript) {
		this.sourceTranscript = sourceTranscript;
		this.targetTranscript = targetTranscript;
		this.waiting = [];
		sourceTranscript.subscribe(['new', 'changed'], this.translate.bind(this));
		this.eventListeners = {
			translationRequested: [],
			translated: [],
			error: [],
		};
	}
	translate(line) {
		let target;
		if (line in this.targetTranscript) {
			target = this.targetTranscript.find(line);
		} else {
			target = new Line(line);
		}
		this.sendRequest(line.text).then(translation => {
			target.text = translation;
			if (!(line in this.targetTranscript)) {
				this.targetTranscript.addLine(target);
			}
			this.handleEvent("translated", {
				originalLine: line,
				targetLine: target,
				translation: translation,
			});
		}).catch(e => {
			this.handleEvent("error", {
				originalLine: line,
				targetLine: target,
				translation: translation,
			});
		});
		this.handleEvent("translationRequested", {
			originalLine: line,
		});
	}

	async sendRequest(text) {
		const data = {"text": text};
		const url = "translate.php";
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(data),
		});
		const json = await response.json();
		if (json.translations && json.translations.length && json.translations[0].text) {
			return json.translations[0].text.trim();
		}
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
}
