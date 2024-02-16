
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
	def __init__(self, source_transcript, target_transcript):
		self.source_transcript = source_transcript
		self.target_transcript = target_transcript
		self.waiting = []
		#source_transcript.subscribe(['new', 'changed'], self.translate)
		source_transcript.subscribe(['new', 'changed'], self.translate_in_background)
		self.event_listeners = {
			"translation_requested": [],
			"translated": [],
			"error": [],
		}
		self._background_tasks = set()

	async def translate(self, line):
		if (line.tid in self.target_transcript.lines):
			target = self.target_transcript.lines[line.tid]
		elif isinstance(line, Line):
			target = Line.from_json(str(line))
		else:
			target = Line(**line)

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
	def __init__(self, source_transcript, target_transcript, auth_key: str = None):
		super().__init__(source_transcript, target_transcript)
		if auth_key is None:
			auth_key = os.environ.get("DEEPL_AUTH_KEY")
		self._auth_key = auth_key

	async def send_request(self, text: str, source_lang: str, target_lang: str):
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
		return text
