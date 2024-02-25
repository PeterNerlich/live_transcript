
import os
import requests
import asyncio
from async_lru import alru_cache

from transcript import Line

refs = set()

def to_async(func):
	def helper(*args, **kwargs):
		task = asyncio.create_task(func(*args, **kwargs))
		# create strong ref
		refs.add(task)
		task.add_done_callback(refs.discard)
	return helper


class Translator:
	def __init__(self, source_transcript, target_transcript, paused=False):
		self.source_transcript = source_transcript
		self.target_transcript = target_transcript
		self.queued = []
		self.waiting = []
		#source_transcript.subscribe(['new', 'changed'], self.translate)
		source_transcript.subscribe(['new', 'changed'], self.queue_translation)
		self.event_listeners = {
			"translation_requested": [],
			"translated": [],
			"error": [],
		}
		self._background_tasks = set()
		self._paused = paused

	async def translate(self, line):
		if (line.tid in self.target_transcript.lines):
			target = self.target_transcript.lines[line.tid]
		elif isinstance(line, Line):
			target = Line.from_json(str(line))
		else:
			target = Line(**line)
		assert target is not line, f"[Translator] line is the same object as target line! {line}, {target}"

		try:
			translation = await self.cached_send_request(line.text,
				self.source_transcript.language,
				self.target_transcript.language)
			target.text = translation
			if line.tid in self.target_transcript.lines:
				self.target_transcript.change_line(target.tid, target.text)
			else:
				self.target_transcript.add_line(target)
			self.handle_event("translated", {
				"original_line": line,
				"target_line": target,
				"translation": translation,
			})
		except Exception as e:
			print(f"failed to translate: {e}")
			self.handle_event("error", {
				"original_line": line,
				"target_line": target,
				#"translation": translation,
			})

		self.handle_event("translation_requested", {
			"original_line": line,
		})

	def translate_in_background(self, line):
		task = asyncio.create_task(self.translate(line))
		self._background_tasks.add(task)

	def queue_translation(self, line):
		if self.paused:
			tids = list(map(lambda x: x.tid, self.queued))
			if line.tid in tids:
				self.queued[tids.index(line.tid)] = line
			else:
				self.queued.append(line)
		else:
			self.translate_in_background(line)

	@property
	def paused(self):
		return self._paused
	@paused.setter
	def paused(self, val):
		val = bool(val)
		old_val = self._paused
		self._paused = val
		if not val and old_val:
			print(f"### queue got unpaused, translating {len(self.queued)} lines")
			while self.queued:
				line = self.queued[0]
				self.queued = self.queued[1:]
				self.translate_in_background(line)
	def pause(self):
		self.paused = True
	def unpause(self):
		self.paused = False

	@alru_cache(maxsize=512)
	async def cached_send_request(self, text: str, source_lang: str, target_lang: str):
		return await self.send_request(text, source_lang, target_lang)

	async def send_request(self, text: str, source_lang: str, target_lang: str):
		raise NotImplementedError()

	def subscribe(self, events, listener: callable):
		if type(events) is str:
			events = [events]
		for event in events:
			if event in self.event_listeners:
				self.event_listeners[event].append(listener)
			else:
				print(f"Event {event} unknown and cannot be subscribed to")

	async def check_on_background_tasks(self):
		for task in tuple(self._background_tasks):
			if task.done():
				self._background_tasks.remove(task)
				await task

	def unsubscribe(self, events, listener: callable):
		if type(events) is str:
			events = [events]
		for event in events:
			if event in self.event_listeners:
				self.event_listeners[event].remove(listener)
			else:
				print(f"Event {event} unknown and cannot be unsubscribed from")

	def handle_event(self, event: str, data):
		if event in self.event_listeners:
			for handler in self.event_listeners[event]:
				handler(data)
		else:
			print(f"Cannot handle unknown event {event}!")


class DeepLTranslator(Translator):
	def __init__(self, source_transcript, target_transcript, auth_key: str = None, paused=False):
		super().__init__(source_transcript, target_transcript, paused)
		if auth_key is None:
			auth_key = os.environ.get("DEEPL_AUTH_KEY")
		self._auth_key = auth_key

	async def send_request(self, text: str, source_lang: str, target_lang: str):
		if not text.strip():
			return text.strip()

		r = await asyncio.to_thread(requests.post,
			url="https://api-free.deepl.com/v2/translate",
			data={
				"source_lang": source_lang.upper(),
				"target_lang": target_lang.upper(),
				"auth_key": self._auth_key,
				"text": text,
			},
		)
		return r.json()["translations"][0]["text"].strip()

class DummyTranslator(Translator):
	async def send_request(self, text: str, source_lang: str, target_lang: str):
		print(f"  DummyTranslator.send_request({repr(text)}, {repr(source_lang)}, {repr(target_lang)})")
		#await asyncio.sleep(.2)
		return text
