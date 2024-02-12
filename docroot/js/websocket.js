
class WebsocketClient {
	constructor(address, role, session, language) {
		this.id = "None";
		this.address = address;
		this.role = role || "editor";
		this.session = session || "default";
		this.language = language || "de";

		this.SEP = " ";
		this.QUOTE = String.fromCharCode(27); // Escape
		this.expecting = null;
		this.intentConnected = false;
		this.socket = null;

		this.queue = [];
		this.waitingForConfirmation = {};
		this.confirmCounter = 0;

		this.eventListeners = {
			left: [],
			new: [],
			deleted: [],
			changed: [],
			split: [],
			merged: [],
			existing: [],
			pong: [],
			becomesHealthy: [],
			becomesUnhealthy: [],
			_closed: [],
		};
		this.setupHooks();

		this.keepalive = window.setInterval(this.checkConnection.bind(this), 2000);
		this.pings = {};
		this._keepaliveID = 0;
		this.connectionCondition = {
			state: "closed",
			ping: undefined,
			recentPings: [],
			pingAvg: undefined,
			channel: undefined,
		};
	}

	connect(keepIntent) {
		if (!keepIntent) this.intentConnected = true;
		if (this.socket && this.socket.readyState === 1) return;
		if (!this.socket || this.socket.readyState > 1) {
			this.socket = new WebSocket(this.address);
		}
		this.socket.addEventListener("open", this.enterChannel.bind(this));
		this.socket.addEventListener("close", this._handleClose.bind(this));
		this.socket.addEventListener("message", this.handleMessage.bind(this));
		this._keepaliveID = 0;
	}
	close() {
		this.intentConnected = false;
		this.socket.close();
	}
	_handleClose() {
		if (this.expecting) this.expecting(null);
		this.handleEvent("_closed");
		if (this.intentConnected) {
			this.connect(true);
		}
		/*for (let counter in this.waitingForConfirmation) {
			if (!this.waitingForConfirmation[counter].ifUnhealthy) {
				window.clearTimeout(this.waitingForConfirmation[counter].timeout);
			}
		}*/
	}

	leave() {
		this.socket.send(this.args(["leave", `/${this.role}/${this.session}/${this.language}`, "id", this.id]));
	}

	handleMessage(event) {
		const msg = event.data;
		const verbs = this.parse(msg);
		if (verbs[0] === "pong") {
			this.pong(verbs.slice(1).join(this.SEP));
		} else if (verbs[0] === "confirm") {
			this.confirm(verbs[1], verbs.slice(2));
		} else if (this.expecting) {
			this.expecting(verbs);
		} else {
			if (verbs.length === 0) {
				throw new EmptyMessageError(this.websocket);
			}
			const parsed = this.parseMessage(verbs);
			if ((["left", "new", "deleted", "changed", "split", "merged", "existing"]).includes(parsed.msg)) {
				this.handleEvent(parsed.msg, parsed);
			} else {
				throw new UnknownMessageError(verbs[0]);
			}
		}
	}

	enterChannel() {
		return this.sendAndWaitForConfirm(["join", `/${this.role}/${this.session}/${this.language}`, "id", this.id], true)
			.then(() => this.connectionCondition.channel = `/${this.role}/${this.session}/${this.language}`)
			.catch(() => {
				delete this.connectionCondition.channel;
				if (this.intentConnected) return this.enterChannel();
			});
	}

	expect(msgs) {
		if (typeof msgs === "string")  msgs = [msgs];
		console.log(`Now expecting ${msgs}`);
		const expecting = (res, rej, verbs) => {
			this.expecting = null;
			if (verbs === null) {
				throw new ConnectionResetError(this.websocket);
			}
			if (verbs.length === 0) {
				throw new EmptyMessageError(this.websocket);
			}
			if (!(msgs === undefined || msgs.includes(verbs[0]))) {
				throw new UnexpectedMessageError(this.websocket, msgs, verbs[0]);
			}
			console.log(`Expection fulfilled: ${verbs}`);
			res(this.parseMessage(verbs));
		}
		const promise = (res, rej) => {
			if (this.expecting !== null) throw new Error("Already expecting");
			this.expecting = expecting.bind(this, res, rej);
		};
		return new Promise(promise.bind(this))
	}

	parseMessage(verbs) {
		if (!verbs.length) throw new EmptyMessageError(this.websocket);

		if (verbs[0] == "pong") {
			// pong <data>
			return {
				"msg": "pong",
				"data": verbs.slice(1).join(this.SEP),
			};
		}

		if (verbs[0] == "setid") {
			// setid <id>
			if (verbs.length < 2) throw new IncompleteMessageError(this.websocket, verbs);
			return {
				"msg": "setid",
				"id": verbs[1],
			};
		}

		if (verbs[0] == "joined") {
			// joined <channel>
			if (verbs.length < 2) throw new IncompleteMessageError(this.websocket, verbs);
			return {
				"msg": "joined",
				"channel": verbs[1],
			};
		}

		if (verbs[0] == "Bye!") {
			// Bye!
			return {
				"msg": "bye",
			};
		}

		if (verbs[0] == "Authentication") {
			// Authentication required
			if (verbs.length < 2) throw new IncompleteMessageError(this.websocket, verbs);
			if (verbs[1] !== "required") throw new UnexpectedKeywordError(this.websocket, verbs);
			return {
				"msg": "Authentication",
			};
		}

		if (verbs[0] == "existing") {
			// existing transcript [<line> ]+
			if (verbs.length < 3) throw new IncompleteMessageError(this.websocket, verbs);
			if (verbs[1] !== "transcript") throw new UnexpectedKeywordError(this.websocket, "lines", verbs[1], verbs);
			return {
				"msg": "existing",
				"lines": verbs.slice(2, verbs.length),
			};
		}

		if (verbs[0] == "new") {
			// new line <line>
			if (verbs.length < 3) throw new IncompleteMessageError(this.websocket, verbs);
			if (verbs[1] != "line") throw new UnexpectedKeywordError(this.websocket, "line", verbs[1], verbs);
			return {
				"msg": "new",
				"line": verbs[2],
			};
		}

		if (verbs[0] == "deleted") {
			// deleted line <tid>
			if (verbs < 3) throw new IncompleteMessageError(this.websocket, verbs);
			if (verbs[1] != "line") throw new UnexpectedKeywordError(this.websocket, "line", verbs[1], verbs);
			return {
				"msg": "deleted",
				"tid": verbs[2],
			};
		}

		if (verbs[0] == "changed") {
			// changed line <tid> to <line>
			if (verbs.length < 3) throw new IncompleteMessageError(this.websocket, verbs);
			if (verbs[1] !== "line") throw new UnexpectedKeywordError(this.websocket, "line", verbs[1], verbs);
			if (verbs[3] !== "to") throw new UnexpectedKeywordError(this.websocket, "to", verbs[3], verbs);
			return {
				"msg": "changed",
				"tid": verbs[2],
				"line": verbs[4],
			};
		}

		if (verbs[0] == "split") {
			// split line <tid> into <one> and <two>
			if (verbs.length < 7) throw new IncompleteMessageError(this.websocket, verbs);
			if (verbs[1] !== "line") throw new UnexpectedKeywordError(this.websocket, "line", verbs[1], verbs);
			if (verbs[3] !== "into") throw new UnexpectedKeywordError(this.websocket, "into", verbs[3], verbs);
			if (verbs[5] !== "and") throw new UnexpectedKeywordError(this.websocket, "and", verbs[3], verbs);
			return {
				"msg": "split",
				"tid": verbs[2],
				"one": verbs[4],
				"two": verbs[6],
			};
		}

		if (verbs[0] === "merged") {
			// merged lines <tid_one> as <line>
			if (verbs.length < 3) throw new IncompleteMessageError(this.websocket, verbs);
			if (verbs[1] !== "lines") throw new UnexpectedKeywordError(this.websocket, "lines", verbs[1], verbs);
			if (verbs[3] != "as") throw new UnexpectedKeywordError(websocket, "as", verbs[3], verbs);
			return {
				"msg": "merged",
				"tid_one": verbs[2],
				"line": verbs[4],
			}
		}

		return verbs[0];
	}

	checkConnection() {
		const condition = this.connectionCondition;
		if (this.socket && this.socket.readyState === 1) {
			const start = Date.now();
			this.ping(this._keepaliveID++).then(() => {
				condition.ping = Date.now() - start;
				condition.recentPings.push(condition.ping)
				condition.recentPings.splice(0, condition.recentPings.length - 3);
				condition.pingAvg = condition.recentPings.reduce((acc, c) => acc + c, 0) / condition.recentPings.length;
				condition.state = "alive";
				//console.log(condition);
			}).catch(e => {
				condition.state = e;
			});
		} else if (this.socket) {
			if (this.socket.readyState === 0) condition.state = "connecting";
			//if (this.socket.readyState === 1) condition.state = "connected";
			if (this.socket.readyState === 2) condition.state = "closing";
			if (this.socket.readyState === 3) condition.state = "closed";
		} else {
			condition.state = "closed";
		}
	}

	ping(data) {
		return new Promise((res, rej) => {
			this.socket.send(this.args(["ping", data]));
			const timeout = window.setTimeout(rej.bind(this, "timeout"), 5000);
			this.pings[data] = {timeout, res, rej};
		});
	}
	pong(data) {
		if (data in this.pings) {
			window.clearTimeout(this.pings[data].timeout);
			this.pings[data].res();
			delete this.pings[data];
		} else {
			console.warn(`Pong for unknown ping! ${data}`);
		}
		this.handleEvent("pong");
	}

	sendAndWaitForConfirm(verbs, ifUnhealthy) {
		return new Promise((res, rej) => {
			const counter = this.confirmCounter++;
			const args = this.args([verbs[0], counter].concat(verbs.slice(1)));
			if (ifUnhealthy || this.isHealthy()) {
				this.socket.send(args);
			} else {
				this.queue.push(args);
			}
			const timeout = window.setTimeout(rej.bind(this, `${counter} timeout`), 50 + 6 * (this.connectionCondition.ping || 4000));
			this.waitingForConfirmation[counter] = {timeout, args, ifUnhealthy, res, rej};
			console.log(` ${counter} waiting (50 + ${6 * (this.connectionCondition.ping || 4000)})`);
		});
	}
	confirm(counter, data) {
		if (counter in this.waitingForConfirmation) {
			window.clearTimeout(this.waitingForConfirmation[counter].timeout);
			this.waitingForConfirmation[counter].res();
			delete this.waitingForConfirmation[counter];
			console.log(` ${counter} confirmed!`);
		} else {
			console.warn(` ${counter} Pong for unknown ping!`);
		}
		this.handleEvent("pong");
	}

	parse(msg) {
		const SEP = this.SEP;
		const QUOTE = this.QUOTE;
		let remaining = msg;
		const verbs = [];
		while (remaining) {
			let endi = remaining.indexOf(QUOTE, 1);
			if (remaining.startsWith(QUOTE) && endi >= 0) {
				verbs.push(remaining.slice(1, endi));
				remaining = remaining.slice(endi+1).trim(); // get rid of any additional whitespace
				continue;
			}
			let i = remaining.indexOf(SEP);
			if (i >= 0) {
				let s = remaining.slice(0, i);
				verbs.push(s);
				remaining = remaining.slice(i+1).trim(); // get rid of any additional whitespace
			} else {
				verbs.push(remaining);
				break;
			}
		}
		return verbs;
	}

	args(list) {
		const SEP = this.SEP;
		const QUOTE = this.QUOTE;
		return list.map(a => `${a}`.includes(SEP) ? `${QUOTE}${a}${QUOTE}` : `${a}`).join(SEP);
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
		const debounceHealthy = stateDebounce(state => this.handleEvent(state ? "becomesHealthy" : "becomesUnhealthy"), 5000, true);

		this.subscribe(["pong", "_closed"], () => {
			debounceHealthy.call(this, this.isHealthy());
		});
		this.subscribe("becomesHealthy", () => {
			/*for (let counter in this.waitingForConfirmation) {
				if (!this.waitingForConfirmation[counter].ifUnhealthy) {
					this.socket.send(this.waitingForConfirmation[counter].args);
				}
			}*/
			while (this.queue.length) {
				this.socket.send(this.queue.splice(0, 1));
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

	isAlive() {
		return this.socket && this.socket.readyState === 1 && this.connectionCondition.state == "alive";
	}
	isHealthy() {
		return this.isAlive() && !!this.connectionCondition.channel;
	}
}

class WebsocketReader extends WebsocketClient {
	constructor(address, session, language) {
		super(address, "reader", session, language);
	}

	enterChannel() {
		super.enterChannel()
		return this.expect("existing").then(transcript => {
			this.handleEvent("existing", transcript);
		});
	}
}

class WebsocketSource extends WebsocketClient {
	constructor(address, session, language) {
		super(address, "source", session, language);
	}

	enterChannel() {
		super.enterChannel()
		return this.expect("Authentication")
			.then(() => {
				this.socket.send(this.args(["auth", 0]));
			});
	}

	submit(lines) {
		if (typeof lines === 'string') lines = [lines];
		return this.sendAndWaitForConfirm(["submit", "lines"].concat(lines)).then(console.log).catch(console.error);
	}
}

class WebsocketEditor extends WebsocketClient {
	constructor(address, session, language) {
		super(address, "editor", session, language);
	}

	enterChannel() {
		super.enterChannel()
		return this.expect("Authentication")
			.then(() => {
				this.socket.send(this.args(["auth", 0]));
			});
	}

	submit(lines) {
		if (typeof lines === 'string') lines = [lines];
		return this.sendAndWaitForConfirm(["submit", "lines"].concat(lines)).then(console.log).catch(console.error);
	}

	delete(tid) {
		return this.sendAndWaitForConfirm(["delete", "line", tid]).then(console.log).catch(console.error);
	}

	change(tid, content) {
		return this.sendAndWaitForConfirm(["change", "line", tid, "to", content]).then(console.log).catch(console.error);
	}

	split(tid, pos) {
		return this.sendAndWaitForConfirm(["split", "line", tid, "at", pos]).then(console.log).catch(console.error);
	}

	merge(one, two) {
		return this.sendAndWaitForConfirm(["merge", "lines", one, "and", two]).then(console.log).catch(console.error);
	}
}


/**************************************/


class TCError extends Error {
	constructor(websocket, msg) {
		if (msg === undefined) {
			msg = "TCException";
		}
		super(`${msg} (from ${websocket})`);
		this.websocket = websocket;
	}
}

class ConnectionResetError extends TCError {}

class EmptyMessageError extends TCError {}

class UnexpectedMessageError extends TCError {
	constructor(websocket, expected, actual) {
		super(websocket, `Expected ${expected}, got ${actual}`);
	}
}

class UnexpectedKeywordError extends TCError {
	constructor(websocket, expected, actual, verbs) {
		super(websocket, `Expected ${expected}, got ${actual} in ${verbs}`);
	}
}

class IncompleteMessageError extends TCError {
	constructor(websocket, verbs) {
		super(websocket, `Too few arguments for ${verbs[0]}: ${verbs.slicey(1)}`);
	}
}

class UnknownMessageError extends TCError {}

class NonexistantChannelError extends TCError {
	constructor(websocket, channel) {
		super(websocket, `Channel ${channel} doesn't exist`);
	}
}
