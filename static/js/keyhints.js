
class KeyHints {
	constructor(scope, legend, legendTimeout=200, debug) {
		this.hints = {};
		this.changeScope(scope || document);
		this.legend = legend;
		this.legendTimeout = legendTimeout;
		this.debug = debug || false;
	}

	matches(actual, desired) {
		for (const [key, value] of Object.entries(desired)) {
			if (actual[key] !== value) return false;
		}
		return true;
	}

	processEvent(event) {
		const entries = Object.entries(this.hints);
		for (const [key, hint] of entries) {
			if (this.matches(event, hint.combination)) {
				this.triggerHint(hint, event);
			} else if (this.debug) {
				console.log(`processEvent() not triggering ${hint.display}, not matching:`, event, hint.combination);
			}
		}
	}

	triggerHint(hint, event) {
		if (hint.legend) {
			if ("type" in hint.combination || ["click", "mousedown"].includes(event.type)) {
				hint.legend.classList.add("pressed");
				if (hint.legendTimeout) window.clearTimeout(hint.legendTimeout);
				hint.legendTimeout = window.setTimeout(() => {
					hint.legend.classList.remove("pressed");
					hint.legendTimeout = null;
				}, this.legendTimeout);
			} else {
				if (event.type === "keydown") {
					hint.legend.classList.add("pressed");
				} else if (event.type === "keyup") {
					hint.legend.classList.remove("pressed");
				}
			}
		}
		if (hint.singleShot && !["keydown", "click", "mousedown"].includes(event.type)) {
			if (this.debug)
				console.log(`triggerHint() ${event.type}  ${hint.display} stopped bc singleShot!`);
			return;
		}
		if (this.debug)
			console.log(`triggerHint() ${event.type}  ${hint.display}`);
		hint.fn(event);
	}

	sortedHints() {
		return Array.prototype.toSorted.call(Object.values(this.hints), (a, b) => {
			return a.sortingOrder - b.sortingOrder;
		});
	}

	addHint(keycombination, fn, display, description, sortingOrder, singleShot, hidden) {
		const key = JSON.stringify(keycombination);
		if (key in this.hints) throw new Error(`Key combination already registered! ${keycombination}`);
		this.hints[key] = {
			combination: keycombination,
			fn: fn,
			display: display,
			description: description,
			sortingOrder: sortingOrder,
			singleShot: singleShot,
			hidden: hidden
		}
		this.queueUpdateLegend();
	}
	removeHint(keycombination) {
		const key = JSON.stringify(keycombination);
		this.cleanupHintLegendEventListeners(this.hints[key]);
		delete this.hints[key];
		this.queueUpdateLegend();
	}

	changeScope(newScope) {
		if (this.scope !== newScope) {
			if (this.scope !== undefined) {
				this.scope.removeEventListener("keydown", this.processEvent.bind(this));
				this.scope.removeEventListener("keyup", this.processEvent.bind(this));
			}
			this.scope = newScope;
			if (newScope) {
				this.scope.addEventListener("keydown", this.processEvent.bind(this));
				this.scope.addEventListener("keyup", this.processEvent.bind(this));
			}
		}
	}

	updateLegend() {
		if (this.legend) {
			const hints = this.sortedHints();
			let i;
			for (i = 0; i < hints.length; i++) {
				this.cleanupHintLegendEventListeners(hints[i]);
				if (hints[i].hidden) continue;
				const div = (i < this.legend.children.length ?
					this.legend.children[i] :
					this.legend.appendChild(document.createElement('div'))
				);
				const shouldRedo = !(
					div.children.length == 1 &&
					div.childNodes.length == 2 &&
					div.childNodes[0].nodeType == document.ELEMENT_NODE &&
					div.childNodes[0].tagName == "CODE" &&
					div.childNodes[1].nodeType == document.TEXT_NODE
				);
				if (shouldRedo) {
					div.replaceChildren();
					div.appendChild(document.createElement("code"));
					div.append(document.createTextNode(" "));
				}
				const code = div.childNodes[0];
				const text = div.childNodes[1];
				if (code.innerText !== hints[i].display) {
					code.innerText = hints[i].display;
				}
				if (text.data !== ` ${hints[i].description}`) {
					text.data = ` ${hints[i].description}`;
				}
				div.addEventListener("mousedown", ((hint, e) => {
					e.stopImmediatePropagation();
					e.preventDefault();
					this.triggerHint(hint, e);
				}).bind(this, hints[i]));
				hints[i].legend = div;
			}
			while (this.legend.children.length > i) {
				this.legend.removeChild(this.legend.children[i]);
			}
		}
	}

	queueUpdateLegend() {
		if (!this.legendUpdateQueued) {
			this.legendUpdateQueued = setTimeout(() => {
				this.updateLegend();
				this.legendUpdateQueued = null;
			}, 0);
		}
	}

	clearLegend() {
		if (this.legend) {
			this.legend.replaceChildren();
			Object.values(this.hints).forEach(hint => {
				this.cleanupHintLegendEventListeners(hint);
				delete hint.legend;
			});
		}
	}

	changeLegend(newLegend) {
		if (this.legend !== newLegend) {
			this.clearLegend();
			this.legend = newLegend;
			this.queueUpdateLegend();
		}
	}

	cleanupHintLegendEventListeners(hint) {
		if (hint.legend) {
			hint.legend.removeEventListener("click", this.triggerHint.bind(this, hint));
		}
	}
}
