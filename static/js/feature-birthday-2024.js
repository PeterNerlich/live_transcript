
(() => {
	const feature = "feature-birthday-2024";
	const coneParticleCount = 100;

	const queryArgs = new URLSearchParams(window.location.search);
	const availableLanguages = ["uk", "en", "ro", "de"];
	const browserlang = navigator.languages.find(lang => availableLanguages.includes(lang));
	const lang = queryArgs.get("lang") || localStorage.getItem("language") || browserlang || "uk";

	let style = null;
	const container = document.createElement("div");
	container.id = feature;
	container.classList.add("initial");
	function toggleContainer() {
		container.classList.remove("initial");
		if (container.classList.contains("showing")) {
			container.classList.remove("showing");
			if (container.classList.contains("first-time")) {
				container.classList.add("not-first-time");
				container.classList.remove("first-time");
				localStorage.setItem(feature, "not-first-time");
			}
		} else {
			container.classList.add("showing");
			if (container.classList.contains("not-first-time")) {
				container.classList.remove("not-first-time");
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
		window.open(`${feature}/survey.html`);
		e.stopPropagation();
	});
	// prevent text being clicked to close popup
	[headline, p1, p2, p3, p4].forEach(el => {
		el.addEventListener("click", e => e.stopPropagation());
	});
	extra.replaceChildren(p1, p2, p3, p4, btnSurvey);
	text.replaceChildren(headline, btnMore, btnClose, extra);
	container.replaceChildren(measure, box, text);

	function translateElements(lang) {
		headline.innerText = l10n(lang, "headline");
		btnMore.innerText = l10n(lang, "btnMore");
		btnClose.innerText = l10n(lang, "btnClose");
		p1.innerText = l10n(lang, "p1");
		p2.innerText = l10n(lang, "p2");
		p3.innerText = l10n(lang, "p3");
		p4.innerText = l10n(lang, "p4");
		btnSurvey.innerText = l10n(lang, "btnSurvey");
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
				if (selector.startsWith("@keyframes")) {
					console.log(selector + "{" + propText + "}");
					console.log(sheet.cssRules[sheet.cssRules.length-1].cssText);
				}
			};
		})(style);

		addRule(`#${feature}`, {
			position: "fixed",
			top: "1.5em",
			left: ".5em",
			width: "5em",
			height: "5em",
			overflow: "hidden",
			background: "rgba(0, 0, 0, .5)",
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

		addRule(`#${feature} .text`, {
			"max-height": 0,
			"font-size": "1.2em",
			"overflow-y": "hidden",
			"transition-duration": ".4s !important",
		});
		addRule(`#${feature}.showing .text`, {
			"max-height": "800vh",
			padding: "2em",
			"padding-top": 0,
		});
		addRule(`#${feature}.first-time .extra, #${feature}.not-first-time .extra`, {
			display: "none",
		});

		addRule(`#${feature} button`, {
			margin: ".1em .5em",
			padding: ".4em 1.5em",
			border: 0,
			"border-radius": ".2em",
			"font-size": "1em",
			color: "#fff",
			"background-color": "#66d",
		});
		addRule(`#${feature} button:hover, #${feature} button:active, #${feature} button:focus`, {
			"background-color": "#77f",
		});
		addRule(`#${feature}:not(.first-time) button.more`, {
			display: "none",
		});
		addRule(`#${feature} button.survey`, {
			"font-size": "1.5em",
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
			perspective: "20rem",
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
			addRule(`#${feature}.showing .confetti-cone i:nth-of-type(${i})`, {
				transform: `translate3d(
						${random(200) - 100}px,
						${random(460)}px,
						${random(100)}px
					)
					rotate3d(${random()}, ${random()}, ${random()}, ${random(2000)}deg)`,
				width: `${random(8)}px`,
				height: `${random(16)}px`,
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
						return "Um Sylvester letzten Jahres war der Moment, in dem dieses Projekt ins Leben gerufen wurde. Der erste Prototyp war nur eine schnell zusammengewürfelte Seite, die eine bestehende Lösung zur Erzeugung von Untertiteln aus Live-Audio, das über das Mikrofon eingespeist wird, aufnahm und mit DeepL übersetzte. Ein paar Wochen lang saßen wir dicht gedrängt an einem einzigen Laptop-Bildschirm. Im Februar begannen wir mit der Arbeit an der aktuellen Lösung: Eine Website für Mobiltelefone, so dass die übersetzten Zeilen überall im Publikum sitzend gelesen werden konnten. Sie war ausgereift genug, um sie anderen zum Ausprobieren zur Verfügung zu stellen, aber es gab noch viele Probleme und Fehler zu beheben, bis sie zuverlässig genug war, um das Verständnis der Veranstaltung am Veranstaltungsort tatsächlich zu unterstützen. Erschwerend kam noch eine zweite Komponente hinzu, die sich als Ursache für unzählige neue Probleme und Instabilitäten herausstellte: ein WiFi-Hotspot, der als eine Art digitales Zeichen für die Übersetzung der Veranstaltung dienen sollte. Im Mai legten wir uns auf den Namen TranslateLive.xyz fest, und im Laufe des Jahres wurde die Stabilität langsam verbessert, und wir begannen, auch andere Veranstaltungen der Gemeinde zu übersetzen, nicht nur den Gottesdienst an Samstagen, und gewannen einige Freiwillige, die das System betreuen, wenn der Autor dieses Textes nicht selbst anwesend sein kann.";
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
			default:
				return `[[ MISSING TRANSLATION ${string} ]]`;
		}
	}
})();
