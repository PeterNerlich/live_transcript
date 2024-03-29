
class UUIDv4 extends String {
	constructor() {
		const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
			const r = Math.random() * 16 | 0, 
				v = c == 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
		super(id);
	}
}


/**************************************/


function logAll(obj, name, except) {
	for (let key in obj.eventListeners) {
		if (except && except.includes(key)) continue;
		obj.subscribe(key, console.log.bind(this, `[${name} | ${key}]`));
	}
}


/**************************************/


const getClientVersion = (() => {
	let promise;

	return url => {
		if (promise === undefined) {
			promise = fetch(url || "version.json").then(response => {
				if (!response.ok) {
					throw new Error("HTTP error " + response.status);
				}
				return response.json();
			}).then(json => {
				return json.releaseTag;
			}).catch(error => {
				version = null;
				throw error;
			});
		}
		return promise;
	}
})();

function displayClientVersion() {
	const versionDiv = document.getElementById("version");
	const clientVersionDiv = versionDiv ? versionDiv.querySelector("#client") : null;
	const fallback = "version.json";
	const url = clientVersionDiv ? clientVersionDiv.getAttribute("data-src") || fallback : fallback;
	if (clientVersionDiv) {
		return getClientVersion(url).then(version => {
			clientVersionDiv.innerText = `Version: ${version}`;
		}).catch(e => {
			clientVersionDiv.innerText = "Version: Unknown";
		});
	}
}

function displayServerVersion(version) {
	const versionDiv = document.getElementById("version");
	const serverVersionDiv = versionDiv ? versionDiv.querySelector("#server") : null;
	if (serverVersionDiv) {
		serverVersionDiv.innerText = `| Server: ${version}`;
	}
}


/**************************************/


function parseQueryArgs(query) {
	const fields = query.slice(1).split("&");
	let out = {}
	for (const arg of fields) {
		const key = arg.split("=")[0];
		const value = arg.slice(key.length+1);
		out[key] = value;
	}
	return out;
}


/**************************************/


function setupStickyScroll(elem, clearance, debug) {
	let shouldScroll;
	if (clearance === undefined) clearance = (target) => target.clientHeight * 0.2;
	else if (typeof clearance !== "function") clearance = (target) => clearance;
	if (debug) console.log(`setupStickyScroll(${elem}, ${clearance}, ${debug}) elem=${elem}`);

	function calculateShouldScroll() {
		shouldScroll = elem.scrollTop + elem.clientHeight + clearance(elem) >= elem.scrollHeight;
		if (debug) console.log(`calculateShouldScroll() shouldScroll=${shouldScroll} (scrollTop ${elem.scrollTop} + clientHeight ${elem.clientHeight} + ${clearance(elem)} >= scrollHeight ${elem.scrollHeight}, for ${elem})`);
		return shouldScroll;
	}
	function scrollToBottom(force) {
	    if (debug) console.log(`scrollToBottom(${force}) shouldScroll=${shouldScroll} (${elem})`);
  		if (shouldScroll || force) {
			elem.scrollTop = elem.scrollHeight;
		}
	}
	window.addEventListener("scroll", calculateShouldScroll);
	window.addEventListener("resize", scrollToBottom);

	return {calculateShouldScroll, scrollToBottom};
}


/**************************************/


function debounce(func, wait, immediate) {
	let timeout;
	return function() {
		const context = this,
			args = arguments;
		const callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(function() {
			timeout = null;
			if (!immediate) {
				func.apply(context, args);
			}
		}, wait);
		if (callNow) func.apply(context, args);
	}
}

function stateDebounce(func, wait, immediate, debug) {
	if (debug) console.log(`[debounce] stateDebounce(${func}, ${JSON.stringify(wait)}, ${JSON.stringify(immediate)}, ${JSON.stringify(debug)})`);

	if (immediate) {
		const lastStates = [];
		if (debug) console.log(`[debounce] lastStates = ${JSON.stringify(lastStates)}`);
		return function(state) {
			if (debug) console.log(`[debounce] new state ${JSON.stringify(state)} (in lastStates: ${lastStates.includes(state)})`);
			const context = this,
				args = arguments;
			if (!lastStates.includes(state)) {
				func.apply(context, args);
			}
			lastStates.push(state);
			setTimeout(() => {
				if (lastStates.length > 1) {
					// leave at least one element in
					lastStates.splice(0,1);
				}
			}, wait);
			if (debug) console.log(`[debounce] set lastStates = ${JSON.stringify(lastStates)}`);
		}

	} else {
		let activeState,
			targetState;
		let timeout = null;
		return function(state) {
			const context = this,
				args = arguments;
			if (timeout === null || state !== targetState) {
				timeout = setTimeout(() => {
					if (state !== activeState && state === targetState) {
						activeState = state;
						func.apply(context, args);
					}
				}, wait);
				targetState = state;
			}
		}
	}
}

/****************************/

if (Set.prototype.union === undefined) {
	Set.prototype.union = function union(setB) {
		const _union = new Set(this);
		for (const elem of setB) {
			_union.add(elem);
		}
		return _union;
	}
}

if (Array.prototype.toSorted === undefined) {
	Array.prototype.toSorted = function toSorted(comparefn) {
		if (typeof comparefn !== 'undefined' && !IsCallable(comparefn))
			throw new $TypeError('`comparefn` must be a function');
		var a = Array.from(this);
		a.sort(comparefn);
		return a;
	}
}
