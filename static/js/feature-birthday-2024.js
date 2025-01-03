
(() => {
	const feature = "feature-birthday-2024";
	const coneParticleCount = 100;

	const queryArgs = new URLSearchParams(window.location.search);
	const availableLanguages = ["uk", "en", "ro", "de"];
	const browserlang = navigator.languages.find(lang => availableLanguages.includes(lang));
	const lang = queryArgs.get("lang") || localStorage.getItem("language") || browserlang || "uk";

	let style = null;
	let data = (() => {
		const value = localStorage.getItem(feature) || "{}";
		try {
			return JSON.parse(value);
		} catch (e) {
			console.error(`Unable to load data for feature ${feature} from localStorage:`, e);
			return null;
		}
	})();
	function save(obj, value) {
		if (data === null) {
			console.error(`Not saving data over corrupted value in localStorage`);
			return false;
		}
		let key = obj;
		if (typeof obj === "object" && value === undefined) {
			console.log("Saving as obj:", obj, value);
			Object.entries(obj).forEach(pair => {
				key = pair[0];
				value = pair[1];
				console.log(key, "→", value);
				data[key] = value;
			});
		} else {
			const key = obj;
			console.log("Saving as string:", key, value);
			data[key] = value;
		}
		if (!data.id)  data.id = new UUIDv4();
		localStorage.setItem(feature, JSON.stringify(data));
		return true;
	}
	function sendData() {
		//if (!data.surveySent) {
			let sending = data;
			if (data["qTechnical"]) {
				const tech = {
					languages: navigator.languages.toString(),
					screen: `${window.screen.height}×${window.screen.width}; devicePixelRatio=${window.devicePixelRatio}`,
					userAgent: navigator.userAgent,
				};
				sending = Object.assign(tech, data);
			}
			console.log("[SUBMIT] submitting data:", sending);
			fetch(`/${feature}.php`, {
				method: "POST",
				body: JSON.stringify(sending),
				headers: {
					"Content-type": "application/json; charset=UTF-8"
				}
			}).then(() => {
				save("surveySent", true);
				console.log("[SUBMIT] success");
			}).catch(e => {
				console.error("[SUBMIT] error", e);
				const error = document.createElement("p");
				error.classList.add(feature, "error");
				const span = document.createElement("span");
				span.innerText = l10n(lang, "error");
				const br = document.createElement("br");
				const code = document.createElement("code");
				code.innerText = e.toString();
				error.replaceChildren(span, br, code);
				document.body.appendChild(error);
				toggleContainer();
			});
		/*} else {
			console.log("[!SUBMIT]", data, "(not submitted again)")
		}*/
	}

	const container = document.createElement("div");
	container.id = feature;
	container.classList.add("initial");
	if (data["surveyStarted"] && !data["surveySent"])  container.classList.add("survey");
	function toggleContainer() {
		container.classList.remove("initial");
		if (container.classList.contains("showing")) {
			container.classList.remove("showing");
			if (container.classList.contains("first-time")) {
				container.classList.add("not-first-time");
				container.classList.remove("first-time");
				save({"not-first-time": true});
			}
		} else {
			container.classList.add("showing");
			if (container.classList.contains("not-first-time")) {
				container.classList.remove("not-first-time");
			}
			setTimeout(resizeSlideContainer, 1);
			updateProgress();
			if (data["readyForSending"] && !data["surveySent"]) {
				sendData();
			}
		}
	}
	container.addEventListener("click", toggleContainer);

	const measure = document.createElement("div");
	measure.classList.add("measure");

	const box = document.createElement("div");
	box.classList.add("box");
	const scalebox = document.createElement("div");
	scalebox.classList.add("scalebox");
	function findConeScale() {
		const style = window.getComputedStyle(measure);
		box.style.setProperty("--small-scale", parseFloat(style["margin-top"]) / parseFloat(style.height));
		box.style.setProperty("--full-scale", parseFloat(style.width) / parseFloat(style.height));
		console.log(`--small-scale:`, box.style.getPropertyValue("--small-scale"));
		console.log(`--full-scale:`, box.style.getPropertyValue("--full-scale"));
	}
	const cone = document.createElement("div");
	cone.classList.add("confetti-cone");
	window.addEventListener("resize", findConeScale);
	const coneBody = document.createElement("div");
	coneBody.classList.add("body");
	const coneEnd = document.createElement("div");
	coneEnd.classList.add("end");
	for (let i = 0; i < coneParticleCount; i++)  coneEnd.appendChild(document.createElement("i"));
	cone.replaceChildren(coneBody, coneEnd);
	scalebox.replaceChildren(cone);
	box.replaceChildren(scalebox);

	const text = document.createElement("div");
	text.classList.add("text");
	const headline = document.createElement("h1");
	const btnMore = document.createElement("button");
	btnMore.classList.add("more");
	btnMore.addEventListener("click", e => {
		container.classList.remove("first-time");
		e.stopPropagation();
	});
	const btnClose = document.createElement("button");
	btnClose.classList.add("close");
	btnClose.addEventListener("click", e => {
		toggleContainer();
		e.stopPropagation();
	});
	const extra = document.createElement("div");
	extra.classList.add("extra");
	const p1 = document.createElement("p");
	const p2 = document.createElement("p");
	const p3 = document.createElement("p");
	const p4 = document.createElement("p");
	const btnSurvey = document.createElement("button");
	btnSurvey.classList.add("survey");
	btnSurvey.addEventListener("click", e => {
		//window.open(`${feature}/survey.html`);
		container.classList.add("survey");
		container.scrollTop = 0;
		e.stopPropagation();
		setTimeout(resizeSlideContainer, 1);
		save("surveyStarted", true);
	});
	extra.replaceChildren(p1, p2, p3, p4, btnSurvey);
	text.replaceChildren(headline, btnMore, btnClose, extra);

	const survey = document.createElement("div");
	survey.classList.add("survey");
	const progress = document.createElement("div");
	progress.classList.add("progress");
	const btnLater = document.createElement("button");
	btnLater.classList.add("later");
	btnLater.addEventListener("click", e => {
		toggleContainer();
		e.stopPropagation();
	});
	const btnCloseSurvey = document.createElement("button");
	btnCloseSurvey.classList.add("close");
	btnCloseSurvey.addEventListener("click", e => {
		toggleContainer();
		container.classList.remove("survey");
		e.stopPropagation();
	});
	const br = document.createElement("br");
	const btnPrevious = document.createElement("button");
	btnPrevious.classList.add("previous");
	const btnNext = document.createElement("button");
	btnNext.classList.add("next");

	const slideContainer = document.createElement("div");
	slideContainer.classList.add("slideContainer");
	function resizeSlideContainer() {
		const currentSlide = slideContainer.querySelector(".slide.current");
		if (currentSlide) {
			slideContainer.style.setProperty("min-height", `${currentSlide.offsetHeight}px`);
			if (!survey.classList.contains("answerColumns")) {
				const answers = currentSlide.querySelectorAll(".answers button");
				if (answers && answers.length && answers[0].offsetTop != answers[answers.length-1].offsetTop) {
					survey.classList.add("answerColumns");
				}
			}
		}
	}
	window.addEventListener("resize", resizeSlideContainer);
	container.addEventListener("transitionend", resizeSlideContainer);

	function previousSlide(e) {
		let ret = null;
		const currentSlide = slideContainer.querySelector(".slide.current");
		if (!currentSlide) {
			if (slideContainer.children[0]) {
				slideContainer.children[0].classList.add("current");
				survey.classList.add("firstSlide");
				if (slideContainer.children[0].classList.contains("answered")) {
					survey.classList.add("answered");
				} else {
					survey.classList.remove("answered");
				}
			}
		} else if (currentSlide.previousElementSibling) {
			currentSlide.classList.remove("current");
			const previous = currentSlide.previousElementSibling;
			previous.classList.add("current");
			if (!previous.previousElementSibling) {
				survey.classList.add("firstSlide");
			} else {
				survey.classList.remove("firstSlide");
			}
			if (previous.classList.contains("answered")) {
				survey.classList.add("answered");
			} else {
				survey.classList.remove("answered");
			}
			ret = Array.from(previous.classList).filter(x => !["slide", "current"].includes(x))[0];
		}
		survey.classList.remove("lastSlide");
		if (e)  e.stopPropagation();
		updateProgress();
		setTimeout(resizeSlideContainer, 1);
		return ret;
	}
	btnPrevious.addEventListener("click", previousSlide);
	function nextSlide(e) {
		let ret = null;
		const currentSlide = slideContainer.querySelector(".slide.current");
		if (!currentSlide) {
			if (slideContainer.children[slideContainer.children.length-1]) {
				slideContainer.children[slideContainer.children.length-1].classList.add("current");
				survey.classList.add("lastSlide");
				if (slideContainer.children[slideContainer.children.length-1].classList.contains("answered")) {
					survey.classList.add("answered");
				} else {
					survey.classList.remove("answered");
				}
			}
		} else if (currentSlide.nextElementSibling) {
			currentSlide.classList.remove("current");
			const next = currentSlide.nextElementSibling;
			next.classList.add("current");
			if (!next.previousElementSibling) {
				survey.classList.add("lastSlide");
			} else {
				survey.classList.remove("lastSlide");
			}
			if (next.classList.contains("answered")) {
				survey.classList.add("answered");
			} else {
				survey.classList.remove("answered");
			}
			ret = Array.from(next.classList).filter(x => !["slide", "current"].includes(x))[0];
			if (next === slideContainer.querySelector(".slide:last-of-type")) {
				save("readyForSending", true);
				sendData();
			}
		}
		survey.classList.remove("firstSlide");
		if (e)  e.stopPropagation();
		updateProgress();
		setTimeout(resizeSlideContainer, 1);
		return ret;
	}
	btnNext.addEventListener("click", nextSlide);
	function updateProgress() {
		const slides = Array.from(slideContainer.children);
		const currentSlide = slideContainer.querySelector(".slide.current");
		const idx = slides.indexOf(currentSlide);
		progress.style.setProperty("--total", slides.length);
		progress.style.setProperty("--progress", (idx + 1) / slides.length);
	}

	survey.replaceChildren(btnLater, btnCloseSurvey, progress, btnPrevious, btnNext, slideContainer);
	container.replaceChildren(measure, box, text, survey);

	const slides = [
		"qGerman",
		"qUnderstandable",
		"qSenseOfBelonging",
		"qNonsense",
		"qReliability",
		"qLatency",
		"qInitialTranslationBad",
		"qCorrectionsConfusing",
		"qDiffConfusing",
		"qDiffHelpful",
		"qDiffUnexplained",
		"qDiffRedDisruptive",
		"qLineGap",
		"qOwnDataPlan",
		"qWifiHelpful",
		"qBugsSpotted",
		"qScrollSluggish",
		"qBatteryDrain",
		"qLyricsHelpful",
		"qAnnouncementsHelpful",
		"qUsedAsCalendar",
		"qReadingAgain",
		"qReadingInAbsence",
		"qMisc",
		"qTechnical",
		"pThanks",
	];

	slides.forEach((q, i) => {
		const slide = document.createElement("div");
		slide.classList.add("slide", q);
		const answer = data[q];
		if (data["nextQuestion"] === q || (data["nextQuestion"] === undefined && i == 0)) {
			slide.classList.add("current");
			if (answer !== undefined)  survey.classList.add("answered");
			if (i == 0)  survey.classList.add("firstSlide");
			if (i == slides.length-1)  survey.classList.add("lastSlide");
		}
		if (answer !== undefined)  slide.classList.add("answered");
		if (q !== "qTechnical") {
			const p = document.createElement("p");
			slide.appendChild(p);
		}

		switch (q) {
			case "qMisc":
				const textarea = document.createElement("textarea");
				if (answer !== undefined)  textarea.value = answer;
				slide.appendChild(textarea);
				const br = document.createElement("br");
				slide.appendChild(br);
				const btn = document.createElement("button");
				btn.classList.add("next");
				btn.addEventListener("click", () => {
					save(q, textarea.value);
					const next = nextSlide();
					if (!slide.classList.contains("answered")) {
						slide.classList.add("answered");
						if (next)  save("nextQuestion", next);
					}
					if (data["surveyLanguage"] !== lang)  save("surveyLanguage", lang);
				});
				slide.appendChild(btn);
				break;
			case "qTechnical":
				const label = document.createElement("label");
				const span = document.createElement("span");
				const input = document.createElement("input");
				input.setAttribute("type", "checkbox");
				if (answer !== undefined)  input.checked = answer;
				function compatChecked() {
					if (input.checked) {
						label.classList.add("checked");
					} else {
						label.classList.remove("checked");
					}
				}
				label.addEventListener("click", compatChecked);
				compatChecked()
				label.replaceChildren(input, span);
				slide.appendChild(label);

				const br2 = document.createElement("br");
				slide.appendChild(br2);
				const btn2 = document.createElement("button");
				btn2.classList.add("next");
				btn2.addEventListener("click", () => {
					save(q, input.checked);
					const next = nextSlide();
					if (!slide.classList.contains("answered")) {
						slide.classList.add("answered");
						if (next)  save("nextQuestion", next);
					}
					if (data["surveyLanguage"] !== lang)  save("surveyLanguage", lang);
				});
				slide.appendChild(btn2);

				const ul = document.createElement("ul");
				["liTechnicalLanguages", "liTechnicalScreen", "liTechnicalUserAgent"].forEach(datum => {
					const li = document.createElement("li");
					li.classList.add(datum);
					const span = document.createElement("span");
					const code = document.createElement("code");
					switch (datum) {
						case "liTechnicalLanguages":
							code.innerText = navigator.languages.toString();
							break;
						case "liTechnicalScreen":
							code.innerText = `${window.screen.height}×${window.screen.width}; devicePixelRatio=${window.devicePixelRatio}`;
							break;
						case "liTechnicalUserAgent":
							code.innerText = navigator.userAgent;
							break;
						default:
							code.innerText = `[[ MISSING DEFINITION ${datum} ]]`;
					}
					li.replaceChildren(span, code);
					ul.appendChild(li);
				});
				slide.appendChild(ul);
				break;
			case "pThanks":
				break;
			default:
				const answers = document.createElement("div");
				answers.classList.add("answers");
				["disagree", "neutral", "agree"].forEach(notion => {
					const btn = document.createElement("button");
					btn.classList.add(notion);
					if (answer !== undefined && answer == notion) {
						btn.classList.add("answer");
					}
					btn.addEventListener("click", () => {
						save(q, notion);
						answers.querySelectorAll("button").forEach(b => {
							if (b !== btn)  b.classList.remove("answer");
						});
						btn.classList.add("answer");
						const next = nextSlide();
						if (!slide.classList.contains("answered")) {
							slide.classList.add("answered");
							if (next)  save("nextQuestion", next);
						}
						if (data["surveyLanguage"] !== lang)  save("surveyLanguage", lang);
					});
					answers.appendChild(btn);
				});
				slide.appendChild(answers);
		}

		slideContainer.appendChild(slide);
	});

	// prevent text being clicked to close popup
	[headline, p1, p2, p3, p4, survey].forEach(el => {
		el.addEventListener("click", e => e.stopPropagation());
	});

	function translateElements(lang) {
		headline.innerText = l10n(lang, "headline");
		btnMore.innerText = l10n(lang, "btnMore");
		btnClose.innerText = btnCloseSurvey.innerText = l10n(lang, "btnClose");
		btnLater.innerText = l10n(lang, "btnLater");
		p1.innerText = l10n(lang, "p1");
		p2.innerText = l10n(lang, "p2");
		p3.innerText = l10n(lang, "p3");
		p4.innerText = l10n(lang, "p4");
		btnSurvey.innerText = l10n(lang, "btnSurvey");
		btnPrevious.innerText = l10n(lang, "btnPrevious");
		btnNext.innerText = l10n(lang, "btnNext");

		slides.forEach(q => {
			const slide = survey.querySelector(`.slide.${q}`);
			const e = slide.querySelector("p") || Array.from(slide.querySelectorAll('label input[type="checkbox"]')).map(e => e.parentElement.querySelector('span'))[0];
			//const e = slide.querySelector('p, label:has(input[type="checkbox"]) span');
			if (e)  e.innerText = l10n(lang, q);
			if (["qMisc", "qTechnical"].includes(q)) {
				const btn = slide.querySelector("button.next");
				btn.innerText = l10n(lang, "btnNext");
			}
			if (q == "qTechnical") {
				["liTechnicalLanguages", "liTechnicalScreen", "liTechnicalUserAgent"].forEach(datum => {
					const span = slide.querySelector(`li.${datum} span`);
					if (span)  span.innerText = l10n(lang, datum);
				});
			}
			["disagree", "neutral", "agree"].forEach(notion => {
				const btn = slide.querySelector(`button.${notion}`);
				if (btn)  btn.innerText = l10n(lang, `btn-${notion}`);
			});
		});
	}
	translateElements(lang);



	document.addEventListener("DOMContentLoaded", () => {
		const now = Date.now();
		if (location.host == "tr.pet09804.uber.space" || location.protocol == "file:" ||
			(Date.parse("2024-12-27") < now && now < Date.parse("2025-01-17"))) {
			// allow feature
			console.log(`Loading ${feature}`);
		} else {
			console.log(`Not loading ${feature}: ${location.host == "tr.pet09804.uber.space"} || ${location.protocol == "file:"} || (${Date.parse("2024-12-27") < now} && ${now < Date.parse("2025-01-17")})`);
			return;
		}

		if (localStorage.getItem(feature) === null) {
			container.classList.add("showing", "first-time");
		}
		setupStyle();
		document.body.appendChild(container);
		findConeScale();
	});


	function setupStyle() {
		if (style !== null) return;

		style = document.createElement("style");
		var addRule = (function (style) {
			var sheet = document.head.appendChild(style).sheet;
			return function (selector, css) {
				var propText = typeof css === "string" ? css : Object.keys(css).map(function (p) {
					return p + ":" + (p === "content" ? "'" + css[p] + "'" : css[p]);
				}).join(";");
				sheet.insertRule(selector + "{" + propText + "}", sheet.cssRules.length);
			};
		})(style);

		addRule(`#${feature}`, {
			position: "fixed",
			top: "1.5em",
			left: ".5em",
			width: "5em",
			height: "5em",
			overflow: "hidden",
			//overflow: "clip",
			background: "rgba(0, 0, 0, .5)",
		});

		addRule(`.${feature}.error`, {
			position: "fixed",
			top: "1em",
			left: ".5em",
			right: ".5em",
			padding: ".5em",
			border: ".1em solid rgba(255,0,0,.3)",
			"box-sizing": "border-box",
			color: "#fdc",
			background: "rgba(60, 0, 0, .8)",
		});

		addRule(`#${feature}.showing`, {
			top: 0,
			left: 0,
			width: "100vw",
			height: "100vh",
			"overflow-y": "scroll",
			background: "rgba(0, 0, 0, .6)",
			"backdrop-filter": "blur(.2em)",
		});

		addRule(`#${feature} .measure`, {
			position: "absolute",
			width: "30vmin",
			height: "12.5rem",
			"margin-top": "4em",
			"pointer-events": "none",
		});

		addRule(`#${feature} .box`, {
			display: "inline-block",
			width: "calc(12.5rem * var(--scale))",
			height: "calc(12.5rem * var(--scale))",
			"margin-top": ".5em",
			opacity: .7,
			"--scale": .384,
		});
		addRule(`#${feature} .scalebox`, {
			width: "12.5rem",
			height: "12.5rem",
			transform: "scale(var(--scale))",
			"transform-origin": "top left",
		});
		addRule(`#${feature}.showing .box`, {
			"margin-top": "calc(40vh - 20vmin)",
			opacity: 1,
		});
		addRule(`#${feature} .box`, {
			"--scale": "var(--small-scale)",
		});
		addRule(`#${feature}.showing .box`, {
			"--scale": "var(--full-scale)",
		});
		addRule(`#${feature}.showing.survey .box`, {
			"margin-top": "calc(20vh - 10vmin)",
			"--scale": "calc(var(--full-scale) * .5)",
		});

		addRule(`#${feature} .text, #${feature} div.survey`, {
			"max-height": 0,
			"font-size": "1.2em",
			"overflow-y": "hidden",
			//"overflow-y": "clip",
			"transition-duration": ".4s !important",
		});
		addRule(`#${feature}.showing .text, #${feature} div.survey`, {
			"max-height": "800vh",
			padding: "2em",
			"padding-top": 0,
		});
		addRule(`#${feature}.first-time .extra, #${feature}.not-first-time .extra`, {
			display: "none",
		});
		addRule(`#${feature}.survey .text`, {
			display: "none",
		});
		addRule(`#${feature}:not(.survey) div.survey`, {
			display: "none",
		});

		addRule(`#${feature} div.survey .progress`, {
			position: "relative",
			height: ".4em",
			margin: ".7em 0",
			"border-radius": ".2em",
			background: "rgba(127, 127, 127, .3)",
			"box-shadow": "inset rgba(255, 255, 255, .2) 0 0 .2em",
			"--progress": 0,
			"--total": 1,
		});
		addRule(`#${feature} div.survey .progress::before, #${feature} div.survey .progress::after`, {
			content: "",
			position: "absolute",
			top: 0,
			left: 0,
			width: "100%",
			height: "100%",
			"border-radius": ".2em",
			transition: "all .4s ease-out",
		});
		addRule(`#${feature} div.survey .progress::before`, {
			width: "calc(100% * var(--progress))",
			background: "#66d",
		});
		addRule(`#${feature} div.survey .progress::after`, {
			background: "linear-gradient(90deg, transparent, transparent calc(100% - .1em), #fff calc(100% - .1em), #fff 100%)",
			"background-repeat": "repeat-x",
			"background-size": "calc((100% + .1em + 1px) / var(--total))",
			opacity: .1,
		});

		addRule(`#${feature} div.survey .slideContainer`, {
			position: "relative",
			"margin-top": "1em",
			overflow: "hidden",
			//overflow: "clip",
			// fixed width to make height adjustment reliable
			width: "calc(100vw - 4em)",
		});
		addRule(`#${feature} div.survey .slide`, {
			position: "absolute",
			left: "calc(-100% - 2em)",
			width: "100%",
			overflow: "hidden",
			//overflow: "clip",
			transition: "all .4s ease-out",
		});
		addRule(`#${feature} div.survey .slide.current ~ .slide`, {
			left: "calc(100% + 2em)",
		});
		addRule(`#${feature} div.survey .slide.current`, {
			left: 0,
		});
		addRule(`#${feature} div.survey.firstSlide > button.previous`, {
		//addRule(`#${feature} div.survey:has(.slide:first-of-type.current) > button.previous`, {
			display: "none",
		});
		addRule(`#${feature} div.survey:not(.answered) > button.next, #${feature} div.survey.lastSlide > button.next`, {
		//addRule(`#${feature} div.survey:has(.slide.current:not(.answered)) > button.next, #${feature} div.survey:has(.slide:last-of-type.current) > button.next`, {
			display: "none",
		});
		addRule(`#${feature} div.survey.lastSlide > button.later`, {
		//addRule(`#${feature} div.survey:has(.slide:last-of-type.current) > button.later`, {
			display: "none",
		});
		addRule(`#${feature} div.survey:not(.lastSlide) > button.close`, {
		//addRule(`#${feature} div.survey:has(.slide:last-of-type:not(.current)) > button.close`, {
			display: "none",
		});
		addRule(`#${feature}:not(.showing) div.survey button`, {
			opacity: 0,
			transition: "opacity .4s ease-out",
		});
		addRule(`#${feature} div.survey .answers`, {
			display: "flex",
			"justify-content": "center",
			"flex-wrap": "wrap",
		});
		addRule(`#${feature} div.survey.answerColumns .answers`, {
			"flex-direction": "column",
		});
		addRule(`#${feature} div.survey li`, {
			"text-align": "left",
			color: "#bbd",
			"font-style": "italic",
		});
		addRule(`#${feature} div.survey li code`, {
			color: "#ccc",
			"font-style": "normal",
		});
		addRule(`#${feature} code, .${feature}.error code`, {
			margin: "0 .5em",
			padding: ".1em 0.3em",
			border: ".1em solid rgba(127,127,127,.3)",
			"border-radius": ".2em",
			background: "rgba(200,200,200,.2)",
		});

		addRule(`#${feature} button`, {
			margin: ".1em .5em",
			padding: ".4em 1.5em",
			border: 0,
			"border-radius": ".2em",
			"font-size": "1em",
			color: "#fff",
			"text-shadow": "#000 0 0 .2em",
			"background-color": "var(--bg)",
			"--bg": "#66d",
		});
		addRule(`#${feature} button:hover, #${feature} button:active, #${feature} button:focus`, {
			filter: "brightness(1.1) saturation(1.1)",
		});
		addRule(`#${feature}:not(.first-time) button.more`, {
			display: "none",
		});
		addRule(`#${feature} button.survey`, {
			"font-size": "1.5em",
		});
		addRule(`#${feature} .survey .answers button.disagree`, {
			"--bg": "#c65",
		});
		addRule(`#${feature} .survey .answers button.neutral`, {
			"--bg": "#8ad",
		});
		addRule(`#${feature} .survey .answers button.agree`, {
			"--bg": "#6c6",
		});
		addRule(`#${feature} .survey .answers button.answer`, {
			"box-shadow": "var(--bg) 0 0 0.1em 0.1em, inset #fff 0 0 .5em 0",
		});

		addRule(`#${feature} input[type="checkbox"]`, {
			width: "1.2em",
			height: "1.2em",
			margin: ".1em 1em",
		});
		addRule(`#${feature} label:not(.checked) span`, {
		//addRule(`#${feature} label:has(input[type="checkbox"]:not(:checked)) span`, {
			"text-decoration": "line-through",
			"text-decoration-color": "rgba(255, 110, 90, .75)",
			"text-decoration-thickness": ".1em",
		});

		addRule(`#${feature} textarea`, {
			width: "50em",
			"max-width": "100%",
			"min-height": "5em",
			border: ".2em solid #66d",
			"border-radius": ".2em",
			color: "#fff",
			"box-sizing": "border-box",
			background: "rgba(50,50,50,.5)",
		});

		addRule(`#${feature}:not(.initial), #${feature}:not(.initial) .box, #${feature}:not(.initial) .scalebox, #${feature}:not(.initial) .text`, {
			transition: "all 3s cubic-bezier(0.01, 1, 0.1, .99)",
		});
		addRule(`#${feature}.showing, #${feature}.showing .box, #${feature}.showing .scalebox, #${feature}.showing .text`, {
			transition: "all .3s ease-out",
		});

		/************************/

		addRule(`#${feature} .confetti-cone`, {
			position: "relative",
			transform: "rotate(-132deg)",
			"transform-origin": "50% 60%",
		});
		addRule(`#${feature} .confetti-cone .body`, {
			width: "12.5rem",
			height: "12.5rem",
			"clip-path": "polygon(50% 0%, 16% 100%, 84% 100%)",
			background: `linear-gradient(
					45deg,
					#f64048 10%,
					rgba(0, 0, 0, 0) calc(10% + 1px),
					rgba(0, 0, 0, 0) 20%,
					#f64048 calc(20% + 1px),
					#f64048 30%,
					rgba(0, 0, 0, 0) calc(30% + 1px),
					rgba(0, 0, 0, 0) 40%,
					#f64048 calc(40% + 1px),
					#f64048 50%,
					rgba(0, 0, 0, 0) calc(50% + 1px),
					rgba(0, 0, 0, 0) 60%,
					#f64048 calc(60% + 1px),
					#f64048 70%,
					rgba(0, 0, 0, 0) calc(70% + 1px),
					rgba(0, 0, 0, 0) 80%,
					#f64048 calc(80% + 1px),
					#f64048 90%,
					rgba(0, 0, 0, 0) calc(90% + 1px),
					rgba(0, 0, 0, 0) 100%
				),
				conic-gradient(
					at 50% 0%,
					rgba(255, 230, 66, 0.9) 45%,
					rgba(190, 150, 40, 0.9) 55%
				)`,
		});
		addRule(`#${feature} .confetti-cone .end`, {
			position: "absolute",
			left: "2rem",
			bottom: "-.5rem",
			width: "8.5rem",
			height: "1rem",
			background: "linear-gradient(90deg, rgb(230, 220, 180), rgb(218, 200, 49), rgb(118, 100, 39))",
			"border-radius": "50%",
			perspective: "40rem",
		});

		addRule(`#${feature} .confetti-cone i`, {
			position: "absolute",
			display: "block",
			top: 0,
			left: "50%",
			width: ".5rem",
			height: "1rem",
			background: "#ffeb4f",
			opacity: 0,
			"z-index": 10,
		});
		addRule(`#${feature}.showing .confetti-cone`, {
			animation: "pull 3000ms ease-out infinite forwards",
		});
		addRule(`#${feature}.showing .confetti-cone i`, {
			animation: "3000ms cubic-bezier(0.05, 0.4, 0, 0.95) 200ms infinite normal forwards running bang",
		});
		for (let i = 1; i <= coneParticleCount; i++) {
			const z = random(30);
			addRule(`#${feature}.showing .confetti-cone i:nth-of-type(${i})`, {
				transform: `translate3d(
						${random(10) - 5}rem,
						${random(23)}rem,
						${z}rem
					)
					rotate3d(${random()}, ${random()}, ${random()}, ${random(2000)}deg)`,
				"z-index": 10 + z,
				background: `hsla(${random(12)*360/12}, 100%, 50%, 1)`,
			});
		}
		addRule(`@keyframes bang`,
			`0% {
				transform: translate3d(0, 0, 0);
				opacity: 1;
			}
			50% {
				opacity: 1;
			}
			75% {
				opacity: .9;
			}
			80% {
				opacity: .5;
			}`);

		addRule(`@keyframes pull`,
			`0% {
				transform: rotate(-132deg) translateY(-16px);
			}
			15% {
				transform: rotate(-132deg) translateY(0);
			}`);

	}


	function random(limit) {
		// emulating sass:math.random() behaviour
		if (limit >= 1) return Math.ceil(Math.random() * limit);
		return Math.random();
	}

	function l10n(lang, string) {
		switch (string) {
			case "headline":
				switch (lang) {
					case "de":
						return "Alles Gute zum Geburtstag TranslateLive.xyz!";
					case "uk":
						return "З Днем народження TranslateLive.xyz!";
					case "ro":
						return "La mulți ani TranslateLive.xyz!";
					default:
						return "Happy Birthday TranslateLive.xyz!";
				}
				break;
			case "btnMore":
				switch (lang) {
					case "de":
						return "Mehr lesen";
					case "uk":
						return "Читати далі";
					case "ro":
						return "Citește mai mult";
					default:
						return "Read more";
				}
				break;
			case "btnClose":
				switch (lang) {
					case "de":
						return "Schließen";
					case "uk":
						return "Закрити";
					case "ro":
						return "Închidere";
					default:
						return "Close";
				}
				break;
			case "btnSurvey":
				switch (lang) {
					case "de":
						return "Zur Umfrage";
					case "uk":
						return "До опитування";
					case "ro":
						return "Pentru sondaj";
					default:
						return "To the survey";
				}
				break;
			case "btnLater":
				switch (lang) {
					case "de":
						return "Später fortfahren";
					case "uk":
						return "Продовжити пізніше";
					case "ro":
						return "Continuați mai târziu";
					default:
						return "Continue later";
				}
				break;
			case "btnPrevious":
				switch (lang) {
					case "de":
						return "Vorherige Frage";
					case "uk":
						return "Попереднє питання";
					case "ro":
						return "Întrebarea anterioară";
					default:
						return "Previous question";
				}
				break;
			case "btnNext":
				switch (lang) {
					case "de":
						return "Nächste Frage";
					case "uk":
						return "Наступне питання";
					case "ro":
						return "Următoarea întrebare";
					default:
						return "Next question";
				}
				break;
			case "btn-disagree":
				switch (lang) {
					case "de":
						return "Stimmt nicht";
					case "uk":
						return "Неправда";
					case "ro":
						return "Nu este adevărat";
					default:
						return "Not true";
				}
				break;
			case "btn-neutral":
				switch (lang) {
					case "de":
						return "🤷";
					case "uk":
						return "🤷";
					case "ro":
						return "🤷";
					default:
						return "🤷";
				}
				break;
			case "btn-agree":
				switch (lang) {
					case "de":
						return "Stimmt";
					case "uk":
						return "Правда";
					case "ro":
						return "Adevărat";
					default:
						return "True";
				}
				break;
			case "p1":
				switch (lang) {
					case "de":
						return "TranslateLive.xyz wird 1 Jahr alt! Danke, dass Du bei diesem Start unserer Reise dabei warst.";
					case "uk":
						return "TranslateLive.xyz виповнюється 1 рік! Дякуємо, що були частиною цього початку нашої подорожі.";
					case "ro":
						return "TranslateLive.xyz împlinește 1 an! Vă mulțumim că ați făcut parte din acest început al călătoriei noastre.";
					default:
						return "TranslateLive.xyz turns 1 year old! Thank You for being part of this start of our journey.";
				}
				break;
			case "p2":
				switch (lang) {
					case "de":
						return "Um Sylvester letzten Jahres war der Moment, in dem dieses Projekt ins Leben gerufen wurde. Der erste Prototyp war nur eine schnell zusammengewürfelte Seite, die eine bestehende Lösung zur Erzeugung von Untertiteln aus Live-Audio, das über das Mikrofon eingespeist wird, aufnahm und mit DeepL übersetzte. Ein paar Wochen lang saßen wir dicht gedrängt an einem einzigen Laptop-Bildschirm. Im Februar begannen wir mit der Arbeit an der aktuellen Lösung: Eine Website für Mobiltelefone, so dass die übersetzten Zeilen überall im Publikum sitzend gelesen werden konnten. Bald war sie ausgereift genug, um sie anderen zum Ausprobieren zur Verfügung zu stellen, aber es gab noch viele Probleme und Fehler zu beheben, bis sie zuverlässig genug war, um das Verständnis der Veranstaltung am Veranstaltungsort tatsächlich zu unterstützen. Erschwerend kam noch eine zweite Komponente hinzu, die sich als Ursache für unzählige neue Probleme und Instabilitäten herausstellte: ein WiFi-Hotspot, der als eine Art digitales Zeichen für die Übersetzung der Veranstaltung dienen sollte. Im Mai legten wir uns auf den Namen TranslateLive.xyz fest, und im Laufe des Jahres wurde die Stabilität langsam verbessert, und wir begannen, auch andere Veranstaltungen der Gemeinde zu übersetzen, nicht nur den Gottesdienst an Samstagen, und gewannen einige Freiwillige, die das System betreuen, wenn der Autor dieses Textes nicht selbst anwesend sein kann.";
					case "uk":
						return "Минулий рік став для Сильвестра моментом, коли цей проект зародився. Першим прототипом була нашвидкуруч створена сторінка, яка використовувала існуюче рішення для створення субтитрів з живого аудіо, що подається через мікрофон, і додала переклад за допомогою DeepL. Кілька тижнів ми тісно сиділи за одним екраном ноутбука. У лютому почалася робота над поточним рішенням: Веб-сайт для мобільних телефонів, щоб перекладені репліки можна було читати, сидячи в будь-якому місці в аудиторії. Він став достатньо зрілим для того, щоб його могли випробувати інші, але було ще багато проблем і помилок, які потрібно було виправити, поки він не став достатньо надійним, щоб дійсно допомагати в розумінні події на місці проведення заходу. Ситуація ускладнилася, коли до системи приєднався другий компонент, який виявився джерелом безлічі нових проблем і нестабільності: точка доступу WiFi, що мала слугувати своєрідною цифровою вивіскою, яка повідомляла про те, що захід перекладається. У травні ми зупинилися на назві TranslateLive.xyz, і поступово, протягом року, стабільність роботи покращилася, ми почали перекладати й інші події спільноти, а не лише суботній сервіс, а також залучили кількох волонтерів для нагляду за системою, коли автор цього тексту не може бути присутнім там сам.";
					case "ro":
						return "În jurul Sylvester anul trecut a fost momentul în care acest proiect a prins viață. Primul prototip a fost doar o pagină rapid aruncat împreună care a luat o soluție existentă pentru a produce subtitrări din audio live alimentat prin microfon, și a adăugat traducerea că cu DeepL. Timp de câteva săptămâni, ne-am strâns în jurul unui singur ecran de laptop. În februarie, a început lucrul la soluția actuală: Un site web pentru telefoane mobile, astfel încât replicile traduse să poată fi citite de oriunde din public. Soluția a devenit suficient de matură pentru a putea fi testată și de alții, dar au existat multe probleme și erori care trebuiau rezolvate până când a devenit suficient de fiabilă pentru a ajuta efectiv la înțelegerea evenimentului la fața locului. Acest lucru a fost complicat doar de o a doua componentă care s-a alăturat sistemului, care s-a dovedit a fi rădăcina unei multitudini de noi probleme și instabilități: un hotspot WiFi destinat ca un fel de semn digital care anunța că evenimentul era tradus. În mai, ne-am stabilit asupra numelui TranslateLive.xyz și, încet-încet, de-a lungul anului, stabilitatea s-a îmbunătățit și am început să traducem și alte evenimente ale comunității, nu numai serviciul de sâmbătă, și am dobândit câțiva voluntari care să supravegheze sistemul ori de câte ori autorul acestui text nu poate fi el însuși acolo.";
					default:
						return "Around Sylvester last year was the moment this project came to life. The first prototype was just a quickly thrown together page that took an existing solution to produce subtitles from live audio fed through the microphone, and added translating that with DeepL. For a few weeks, we huddled close around a single laptop screen. In February, work on the current solution began: A website for mobile phones, so the translated lines could be read sitting anywhere in the audience. It became mature enough to give it to others to try out, but there were many issues and bugs to fix until it became reliable enough to actually aid in understanding the event at the venue. This was only complicated by a second component joining the system, which turned out to be the root of a myriad of new problems and instabilities: a WiFi hotspot intended as a kind of digital sign advertising that the event was being translated. In May, we settled on the name TranslateLive.xyz and slowly over the year, stability was improved and we started translating other events of the community, too, not only the service on Saturdays, and aquired a few volunteers to supervise the system whenever the author of this text cannot be there himself.";
				}
				break;
			case "p3":
				switch (lang) {
					case "de":
						return "Vielen Dank, dass du TranslateLive.xyz benutzt und uns ermutigst, die Arbeit fortzusetzen! Wir hoffen, dass wir dir auch in den kommenden Jahren weiterhin Übersetzungen anbieten können - und dass diese auch hilfreich sind.";
					case "uk":
						return "Дякуємо, що користуєтеся TranslateLive.xyz і заохочуєте нас продовжувати роботу! Ми сподіваємося продовжувати надавати вам переклади - і робити їх корисними - у цьому та наступних роках.";
					case "ro":
						return "Vă mulțumim pentru că folosiți TranslateLive.xyz și ne încurajați să ne continuăm munca! Sperăm să continuăm să vă aducem traduceri - și să le facem, de asemenea, utile - în anii următori și viitori.";
					default:
						return "Thank you for using TranslateLive.xyz and encouraging us to keep up the work! We hope to continue bringing you translations – and making them helpful as well – in the coming and future years.";
				}
				break;
			case "p4":
				switch (lang) {
					case "de":
						return "Wenn du magst, würden wir uns über deine Meinung zu ein paar Fragen über deine Erfahrungen mit TranslateLive.xyz freuen.";
					case "uk":
						return "Якщо ви бажаєте, ми будемо раді отримати вашу думку щодо кількох запитань про ваш досвід роботи з TranslateLive.xyz.";
					case "ro":
						return "Dacă doriți, ne-ar face o deosebită plăcere să primim opinia dvs. cu privire la câteva întrebări despre experiența dvs. cu TranslateLive.xyz.";
					default:
						return "If you like, we would be overjoyed to receive your opinion regarding a few questions about your experience with TranslateLive.xyz.";
				}
				break;

			/***********************************/

			case "qGerman":
				switch (lang) {
					case "de":
						return "Ich beherrsche die deutsche Sprache gut genug, um ab und zu während einer Veranstaltung selbst zu verstehen, was gesagt wird";
					case "uk":
						return "Я досить добре розмовляю німецькою, щоб розуміти, що говорять без сторонньої допомоги, час від часу під час заходів";
					case "ro":
						return "Cunosc limba germană suficient de bine încât să înțeleg ce se spune de unul singur din când în când în timpul unui eveniment";
					default:
						return "I know German well enough to understand what is being said on my own every so often during an event";
				}
				break;
			case "qUnderstandable":
				switch (lang) {
					case "de":
						return "Im Durchschnitt habe ich das Gefühl, dass ich verstehe, worüber gesprochen wird, wenn ich TranslateLive.xyz benutze";
					case "uk":
						return "В середньому я відчуваю, що розумію, про що йдеться, коли використовую TranslateLive.xyz";
					case "ro":
						return "În medie, am sentimentul că înțeleg despre ce se vorbește atunci când folosesc TranslateLive.xyz";
					default:
						return "On average, I feel like I understand what is being talked about when using TranslateLive.xyz";
				}
				break;
			case "qSenseOfBelonging":
				switch (lang) {
					case "de":
						return "Ich habe das Gefühl, Teil des Publikums zu sein, wenn ich TranslateLive.xyz benutze - die Veranstaltung „passiert“ nicht mehr nur um mich herum";
					case "uk":
						return "Коли я використовую TranslateLive.xyz, я відчуваю себе частиною аудиторії - подія більше не просто «відбувається» навколо мене";
					case "ro":
						return "Mă simt ca și cum aș face parte din public atunci când folosesc TranslateLive.xyz - evenimentul nu se mai „întâmplă” doar în jurul meu";
					default:
						return "I feel like I am actually part of the audience when using TranslateLive.xyz – the event doesn't just “happen” around me any longer";
				}
				break;
			case "qNonsense":
				switch (lang) {
					case "de":
						return "Es gibt oft erhebliche Zeiträume, in denen ich nichts verstehe";
					case "uk":
						return "Часто бувають значні проміжки часу, коли я нічого не розумію";
					case "ro":
						return "Există adesea perioade semnificative de timp în care nu înțeleg nimic";
					default:
						return "There are often significant time periods where I don't understand a thing";
				}
				break;
			case "qReliability":
				switch (lang) {
					case "de":
						return "Ich bin mir oft nicht sicher, ob die Übersetzung wirklich korrekt ist, selbst wenn der Satz an sich sprachlich korrekt ist";
					case "uk":
						return "Я часто не впевнений, що переклад насправді точний, навіть якщо речення саме по собі правильне з точки зору мови";
					case "ro":
						return "De multe ori nu sunt sigur dacă traducerea este corectă, chiar și atunci când propoziția în sine este corectă";
					default:
						return "I'm often not sure whether the translation is actually accurate, even when the sentence on its own is correct language wise";
				}
				break;
			case "qLatency":
				switch (lang) {
					case "de":
						return "Die Zeit zwischen dem Gesagten und dem Lesen der Übersetzung ist oft zu lang";
					case "uk":
						return "Час між тим, як щось сказано, і читанням перекладу часто занадто довгий";
					case "ro":
						return "Timpul dintre momentul în care se spune ceva și citirea traducerii este adesea prea lung";
					default:
						return "The time between something being said and reading the translation is often too long";
				}
				break;
			case "qInitialTranslationBad":
				switch (lang) {
					case "de":
						return "Die Erstübersetzung ist selten gut, meistens warte ich, bis sie korrigiert wird";
					case "uk":
						return "Початковий переклад рідко буває хорошим, і я здебільшого чекаю, поки його виправлять";
					case "ro":
						return "Traducerea inițială este rareori bună, de cele mai multe ori aștept să fie corectată";
					default:
						return "The initial translation is seldomly any good, I wait for it to get corrected most of the time";
				}
				break;
			case "qCorrectionsConfusing":
				switch (lang) {
					case "de":
						return "Es ist verwirrend, dass die Übersetzungen nach dem ersten Erscheinen auf dem Bildschirm geändert werden";
					case "uk":
						return "Те, що переклад змінюється після першого показу на екрані, збиває з пантелику";
					case "ro":
						return "Faptul că traducerile sunt schimbate după prima apariție pe ecran este confuz";
					default:
						return "That translations get changed after first showing on screen is confusing";
				}
				break;
			case "qDiffConfusing":
				switch (lang) {
					case "de":
						return "Die Farben, die angezeigt werden, wenn etwas geändert wird, sind verwirrend";
					case "uk":
						return "Кольори, які з'являються, коли щось змінюється, збивають з пантелику";
					case "ro":
						return "Culorile care apar atunci când ceva este schimbat sunt confuze";
					default:
						return "The colors that show up when something is changed are confusing";
				}
				break;
			case "qDiffHelpful":
				switch (lang) {
					case "de":
						return "Die Farben helfen mir, auf einen Blick zu sehen, was und wann etwas geändert wird";
					case "uk":
						return "Кольори допомагають мені з першого погляду побачити, що і коли було змінено";
					case "ro":
						return "Culorile mă ajută să văd dintr-o privire ce și când este schimbat ceva";
					default:
						return "The colors help me see at a glance what and when something is changed";
				}
				break;
			case "qDiffUnexplained":
				switch (lang) {
					case "de":
						return "Ich habe keine Ahnung, was die verschiedenen Farben bedeuten";
					case "uk":
						return "Я поняття не маю, що означають різні кольори";
					case "ro":
						return "Nu am nicio idee ce înseamnă diferitele culori";
					default:
						return "I have no clue what the different colors mean";
				}
				break;
			case "qDiffRedDisruptive":
				switch (lang) {
					case "de":
						return "Die rote Anzeige, die erscheint, wenn etwas gelöscht wird, ist eher störend als hilfreich";
					case "uk":
						return "Червоний колір, який з'являється щоразу, коли щось видаляється, більше шкодить, ніж допомагає";
					case "ro":
						return "Roșu care apare de fiecare dată când ceva este șters este mai mult deranjant decât util";
					default:
						return "The red that shows up whenever something is deleted is more disruptive than helpful";
				}
				break;
			case "qLineGap":
				switch (lang) {
					case "de":
						return "Die Lücken zwischen den zeitlich weit auseinander liegenden Zeilen sind hilfreich";
					case "uk":
						return "Проміжки між рядками, віддаленими один від одного в часі, є корисними";
					case "ro":
						return "Spațiile dintre liniile care sunt foarte îndepărtate în timp sunt utile";
					default:
						return "The gaps between lines that are far apart in time are helpful";
				}
				break;
			case "qOwnDataPlan":
				switch (lang) {
					case "de":
						return "Ich benutze oft meinen eigenen Datentarif, auch wenn das WiFi verfügbar ist.";
					case "uk":
						return "Я часто використовую свій власний тарифний план, навіть якщо доступний WiFi";
					case "ro":
						return "Deseori folosesc propriul meu plan de date, chiar dacă WiFi-ul este disponibil";
					default:
						return "I am often using my own data plan, even if the WiFi is available";
				}
				break;
			case "qWifiHelpful":
				switch (lang) {
					case "de":
						return "Das WLAN hilft zu erkennen, ob die Veranstaltung übersetzt wird oder nicht";
					case "uk":
						return "WiFi допомагає побачити, чи перекладається подія чи ні";
					case "ro":
						return "WiFi vă ajută să vedeți dacă evenimentul este tradus sau nu";
					default:
						return "The WiFi helps see whether the event is being translated or not";
				}
				break;
			case "qBugsSpotted":
				switch (lang) {
					case "de":
						return "Ich habe in den letzten 3 Monaten mit TranslateLive.xyz Bugs oder Dinge erlebt, die sich meiner Meinung nach seltsam verhalten haben";
					case "uk":
						return "За останні 3 місяці я стикався з помилками або речами, які, на мою думку, поводилися дивно з TranslateLive.xyz";
					case "ro":
						return "Am experimentat erori sau lucruri care mi s-au părut ciudate cu TranslateLive.xyz în ultimele 3 luni";
					default:
						return "I have experienced bugs or things that I thought behaved weird with TranslateLive.xyz in the last 3 months";
				}
				break;
			case "qScrollSluggish":
				switch (lang) {
					case "de":
						return "Ich habe das Gefühl, dass TranslateLive.xyz sich träge verhält, wenn ich durch zurückliegende Zeilen scrolle";
					case "uk":
						return "Мені здається, що TranslateLive.xyz поводиться повільно під час прокручування попередніх рядків";
					case "ro":
						return "Simt că TranslateLive.xyz se comportă lent atunci când derulați prin liniile trecute";
					default:
						return "I feel like TranslateLive.xyz behaves sluggish when scrolling through past lines";
				}
				break;
			case "qBatteryDrain":
				switch (lang) {
					case "de":
						return "Ich habe das Gefühl, dass die Verwendung von TranslateLive.xyz meinen Akku schneller leert, als es sollte";
					case "uk":
						return "Я відчуваю, що використання TranslateLive.xyz розряджає мій акумулятор швидше, ніж потрібно";
					case "ro":
						return "Simt că utilizarea TranslateLive.xyz îmi scurge bateria mai repede decât ar trebui";
					default:
						return "I feel like using TranslateLive.xyz drains my battery faster than it should";
				}
				break;
			case "qLyricsHelpful":
				switch (lang) {
					case "de":
						return "Ich schätze es sehr, wenn auch die Songtexte übersetzt werden";
					case "uk":
						return "Я також дуже ціную, коли перекладають тексти пісень";
					case "ro":
						return "Apreciez foarte mult când versurile cântecelor sunt traduse, de asemenea";
					default:
						return "I really appreciate whenever the song lyrics get translated, too";
				}
				break;
			case "qAnnouncementsHelpful":
				switch (lang) {
					case "de":
						return "Ich schätze es sehr, wenn die Ankündigungen am Ende der Veranstaltung noch einmal zusammengefasst werden";
					case "uk":
						return "Я дуже ціную, коли анонси ще раз підсумовуються в кінці заходу";
					case "ro":
						return "Apreciez foarte mult când anunțurile sunt din nou rezumate la sfârșitul evenimentului";
					default:
						return "I really appreciate when the announcements are once again summarized at the end of the event";
				}
				break;
			case "qUsedAsCalendar":
				switch (lang) {
					case "de":
						return "Ich öffne TranslateLive.xyz oft unter der Woche, um zu sehen, welche Veranstaltungen als nächstes anstehen";
					case "uk":
						return "Я часто відкриваю TranslateLive.xyz протягом тижня, щоб перевірити, які події відбудуться найближчим часом";
					case "ro":
						return "Des deschid TranslateLive.xyz în timpul săptămânii doar pentru a verifica ce evenimente urmează";
					default:
						return "I often open up TranslateLive.xyz during the week just to check which events are coming up next";
				}
				break;
			case "qReadingAgain":
				switch (lang) {
					case "de":
						return "Ich öffne TranslateLive.xyz oft viel später als die Veranstaltung, um es noch einmal durchzulesen";
					case "uk":
						return "Я часто відкриваю TranslateLive.xyz набагато пізніше події, щоб перечитати її ще раз";
					case "ro":
						return "Adesea deschid TranslateLive.xyz mult mai târziu decât evenimentul pentru a citi din nou";
					default:
						return "I often open up TranslateLive.xyz much later than the event to read through again";
				}
				break;
			case "qReadingInAbsence":
				switch (lang) {
					case "de":
						return "Manchmal öffne ich TranslateLive.xyz, wenn ich nicht an der Veranstaltung teilnehmen konnte";
					case "uk":
						return "Іноді я відкриваю TranslateLive.xyz, коли не можу бути присутнім на заході";
					case "ro":
						return "Uneori deschid TranslateLive.xyz atunci când nu am putut participa la eveniment";
					default:
						return "I sometimes open up TranslateLive.xyz when I was unable to attend the event";
				}
				break;
			case "qMisc":
				switch (lang) {
					case "de":
						return "Gibt es sonst noch etwas, das Sie uns mitteilen möchten? (Vorschläge, Fehler usw.)";
					case "uk":
						return "Чи є щось ще, що ви хотіли б нам розповісти? (пропозиції, помилки тощо)";
					case "ro":
						return "Doriți să ne mai spuneți ceva? (sugestii, erori etc.)";
					default:
						return "Is there anything else you would like to tell us? (suggestions, bugs etc.)";
				}
				break;
			case "qTechnical":
				switch (lang) {
					case "de":
						return "Ich bin mit der Übermittlung der folgenden technischen Daten einverstanden, um sicherzustellen, dass TranslateLive.xyz auf einer Vielzahl von Geräten gut funktioniert";
					case "uk":
						return "Я погоджуюся на відправку наступних технічних даних з єдиною метою забезпечити належну роботу TranslateLive.xyz на широкому спектрі пристроїв";
					case "ro":
						return "Sunt de acord cu trimiterea următoarelor date tehnice cu unicul scop de a asigura că TranslateLive.xyz funcționează bine pe o gamă largă de dispozitive";
					default:
						return "I agree with sending the following technical data for the sole purpose of ensuring TranslateLive.xyz runs well on a wide range of devices";
				}
				break;
			case "liTechnicalLanguages":
				switch (lang) {
					case "de":
						return "Liste der bevorzugten Sprachen, wie von Ihrem Browser gemeldet:";
					case "uk":
						return "Список бажаних мов, згідно з повідомленням вашого браузера:";
					case "ro":
						return "Lista limbilor preferate, conform informațiilor furnizate de browserul dumneavoastră:";
					default:
						return "List of preferred languages, as reported by your browser:";
				}
				break;
			case "liTechnicalScreen":
				switch (lang) {
					case "de":
						return "Abmessungen und Dichte des Bildschirms:";
					case "uk":
						return "Розміри та щільність екрану:";
					case "ro":
						return "Dimensiunile și densitatea ecranului:";
					default:
						return "Screen dimensions and density:";
				}
				break;
			case "liTechnicalUserAgent":
				switch (lang) {
					case "de":
						return "Der UserAgent, den Ihr Browser an Websites sendet und der Aufschluss über den Browser und die Version gibt:";
					case "uk":
						return "UserAgent, який ваш браузер надсилає на веб-сайти, вказуючи, який саме браузер і його версію:";
					case "ro":
						return "UserAgent-ul trimis de browserul dvs. către site-uri web, care dezvăluie browserul și versiunea:";
					default:
						return "The UserAgent your browser sends to websites, disclosing which browser and version:";
				}
				break;
			case "pThanks":
				switch (lang) {
					case "de":
						return "Vielen Dank, dass Sie an unserer Umfrage teilgenommen haben!";
					case "uk":
						return "Дякуємо за участь у нашому опитуванні!";
					case "ro":
						return "Vă mulțumim pentru participarea la sondajul nostru!";
					default:
						return "Thank you for taking part in our survey!";
				}
				break;

			case "error":
				switch (lang) {
					case "de":
						return "Umfrage konnte nicht gesendet werden. Bitte neu laden und erneut versuchen";
					case "uk":
						return "Не вдалося відправити опитування. Будь ласка, перезавантажте і спробуйте ще раз";
					case "ro":
						return "Nu s-a reușit trimiterea sondajului. Vă rugăm să reîncărcați și să încercați din nou";
					default:
						return "Failed to send survey. Please reload and try again";
				}
				break;
			default:
				return `[[ MISSING TRANSLATION ${string} ]]`;
		}
	}
})();
