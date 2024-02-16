
class SpeechToText {
	constructor(language) {
		this.language = language || "de-DE";
		this.intentRunning = false;
		this.isRunning = false;

		this.browserAPI = ('webkitSpeechRecognition' in window) ? new webkitSpeechRecognition() : new SpeechRecognition();
		this.browserAPI.continuous = true;
		this.browserAPI.interimResults = true;
		this.browserAPI.maxAlternatives = 3;
		this.browserAPI.lang = this.language;

		this.eventListeners = {
			begin: [],
			stop: [],
			abort: [],
			error: [],
			intermediates: [],
			results: [],
			audioStart: [],
			audioEnd: [],
			speechStart: [],
			speechEnd: [],
		};
		this.setupHooks();
	}

	begin(language) {
		this.intentRunning = true;
		if (language) {
			this.language = language;
			this.browserAPI.lang = this.language;
		}
		this.browserAPI.start();
	}
	stop() {
		this.intentRunning = false;
		this.browserAPI.stop();
	}
	abort() {
		this.intentRunning = false;
		this.browserAPI.abort();
	}
	restart() {
		this.intentRunning = true;
		// tell api to stop listening and produce a final result
		this.browserAPI.stop();
		this.browserAPI.start();
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

	setupHooks() {
		const debounceRunning = stateDebounce(state => (state ? this._handleStart : this._handleEnd).call(this, arguments), 500, true);
		const debounceSpeech = stateDebounce(state => (state ? this._handleSpeechStart : this._handleSpeechEnd).call(this, arguments), 500, true);
		const debounceAudio = stateDebounce(state => (state ? this._handleAudioStart : this._handleAudioEnd).call(this, arguments), 500, true);

		this.browserAPI.onstart = debounceRunning.bind(this, true);
		this.browserAPI.onerror = this._handleError.bind(this);
		this.browserAPI.onend = (event => {
			//if (event.error === "no-speech") {}
			if (this.intentRunning) {
				try {
					this.browserAPI.start();
				} catch(e) {
					// does this get handled by onerror already?
					console.error(`Already handled or to be thrown again?  ${e}`);
				}
			}
			debounceRunning.call(this, false, arguments);
		}).bind(this);
		this.browserAPI.onspeechstart = debounceSpeech.bind(this, true);
		this.browserAPI.onspeechend = debounceSpeech.bind(this, false);
		this.browserAPI.onaudiostart = debounceAudio.bind(this, true);
		this.browserAPI.onaudioend = debounceAudio.bind(this, false);
		this.browserAPI.onresult = this._handleResult.bind(this);

		this.subscribe("begin", () => { this.isRunning = true; });
		this.subscribe("stop", () => { this.isRunning = false; });
	}

	_handleStart() { this.handleEvent("begin"); }
	_handleError(e) { this.handleEvent("error", e); }
	_handleEnd() { this.handleEvent("stop"); }
	_handleSpeechStart() { this.handleEvent("speechStart"); }
	_handleSpeechEnd() { this.handleEvent("speechEnd"); }
	_handleAudioStart() { this.handleEvent("audioStart"); }
	_handleAudioEnd() { this.handleEvent("audioEnd"); }
	_handleResult(event) {
		const intermediates = [];
		const finals = [];
		for (var i = event.resultIndex; i < event.results.length; ++i) {
			if (event.results[i].isFinal) {
				finals.push(event.results[i]);
			} else {
				intermediates.push(event.results[i]);
			}
		}
		if (intermediates.length) {
			this.handleEvent("intermediates", intermediates);
		}
		if (finals.length) {
			this.handleEvent("results", finals);
		}
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
