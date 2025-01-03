
import os
import requests
import logging
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

		self.logger = logging.getLogger(f"Translator({self.source_transcript.language}, {self.target_transcript.language})")
		self.logger.setLevel(logging.DEBUG)
		log_handler = logging.FileHandler(filename=f"{__name__}.{self.source_transcript.language}_{self.target_transcript.language}.log", encoding="utf-8")
		log_handler.setFormatter(logging.Formatter(fmt='%(asctime)s [%(name)s] %(levelname)s: %(message)s'))
		self.logger.addHandler(log_handler)

	async def translate(self, line):
		if (line.tid in self.target_transcript.lines):
			target = self.target_transcript.lines[line.tid]
		elif isinstance(line, Line):
			target = Line.from_json(str(line))
		else:
			target = Line(**line)
		assert target is not line, f"[Translator] line is the same object as target line! {line}, {target}"

		try:
			translation = await self.cached_send_request(line.text.strip(),
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
			self.logger.exception("failed to translate:")
			print(f"failed to translate: {e!r}")
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
			self.logger.info("queue got unpaused, translating %s lines", len(self.queued))
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
		self.logger.info("translating %i characters: %s", len(text), text)
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
	def __init__(self, source_transcript, target_transcript, auth_key: str = None, backup_auth_key: str = None, paused=False):
		super().__init__(source_transcript, target_transcript, paused)
		if auth_key is None:
			auth_key = os.environ.get("DEEPL_AUTH_KEY")
		if backup_auth_key is None:
			backup_auth_key = os.environ.get("DEEPL_AUTH_KEY_BACKUP")
		self._auth_key = auth_key
		self._backup_auth_key = backup_auth_key
		self._auth_failover = False

	async def send_request(self, text: str, source_lang: str, target_lang: str):
		stripped = text.strip()
		if not stripped:
			return stripped

		try:
			auth_key = self._auth_key if not self._auth_failover else self._backup_auth_key
			r = await asyncio.to_thread(requests.post,
				url="https://api-free.deepl.com/v2/translate",
				data={
					"source_lang": source_lang.upper(),
					"target_lang": target_lang.upper(),
					"auth_key": auth_key,
					"text": stripped,
				},
			)
			if r.status_code == 403:
				raise self.InvalidAuthKey(self._auth_failover)
			if r.status_code == 413:
				raise self.RequestSizeExceedsLimit(self._auth_failover)
			if r.status_code in (429, 529):
				raise self.TooManyRequests(self._auth_failover)
			if r.status_code == 456:
				raise self.QuotaExceeded(self._auth_failover)
			if r.status_code == 500:
				raise self.InternalError(self._auth_failover)
			return r.json()["translations"][0]["text"].strip()
		except self.DeepLException:
			if self._auth_failover or not self._backup_auth_key:
				raise
			# try again
			self._auth_failover = True
			return await self.send_request(text, source_lang, target_lang)


	class DeepLException(Exception):
		def __init__(self, on_failover=False):
			self._on_failover = on_failover
		def __repr__(self):
			fo = " (on failover)" if self._on_failover else ""
			return f"{type(self).__name__}{fo}"
	class InvalidAuthKey(DeepLException):
		pass
	class RequestSizeExceedsLimit(DeepLException):
		pass
	class TooManyRequests(DeepLException):
		pass
	class QuotaExceeded(DeepLException):
		pass
	class InternalError(DeepLException):
		pass

class DummyTranslator(Translator):
	async def send_request(self, text: str, source_lang: str, target_lang: str):
		print(f"  DummyTranslator.send_request({repr(text)}, {repr(source_lang)}, {repr(target_lang)})")
		#await asyncio.sleep(.2)
		return text
