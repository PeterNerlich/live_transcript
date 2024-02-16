
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


function setupStickyScroll(elem, debug) {
	let shouldScroll;
	const target = (elem === document.body.parentElement) ? window : elem;

	function calculateShouldScroll() {
		shouldScroll = elem.scrollTop + elem.clientHeight === elem.scrollHeight;
		if (debug) console.log(`calculateShouldScroll() shouldScroll=${shouldScroll} (${elem})`);
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
