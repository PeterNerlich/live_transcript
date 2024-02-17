
import datetime
import json
import time
import uuid

class Session:
	def __init__(self, name: str = None, start: float = None):
		if start is None:
			start = time.time()
		self.date = start
		if name is None:
			name = datetime.datetime.fromtimestamp(self.date).isoformat()
		self.name = name
		self.uuid = uuid.uuid4()
		self.transcripts = {}

	def add_transcript(self, transcript: "Transcript", language: str = None):
		transcript.time_offset = self.date
		if language is None:
			language = transcript.language
		self.transcripts[language] = transcript


class Transcript:
	def __init__(self, language: str, time_offset: float = 0.0):
		self.language = language
		self.time_offset = time_offset
		self.lines = dict()

		self.event_listeners = {
			"new": [],
			"deleted": [],
			"changed": [],
			"split": [],
			"merged": [],
		}

	def add_line(self, start, end: float = None, text: str = None):
		if isinstance(start, Line):
			line = start
		else:
			line = Line(start, end, text)
		assert(line.tid not in self.lines)
		self.lines[line.tid] = line
		self.handle_event("new", line)
		return line

	def remove_line(self, tid: str):
		line = self.lines.pop(tid)
		if line:
			self.handle_event("deleted", line)
		return line

	def change_line(self, tid: str, content: str):
		line = self.lines[tid]
		if line:
			line.text = content
			self.handle_event("changed", line)
		return line

	def split_line(self, tid: str, position: int):
		line = self.lines[tid]
		if line:
			frac = position / len(line.text)
			assert(frac < 1 and frac > 0)
			mid = (line.end - line.start) * frac + line.start
			new = line.duplicate()
			line.text = line.text[:position].strip()
			new.text = new.text[position:].strip()
			line.end = mid
			new.start = mid
			self.lines[new.tid] = new
			self.handle_event("split", [line, new])
			return [line, new]
		return []

	def merge_lines(self, tid_one: str, tid_two: str):
		one = self.lines[tid_one]
		two = self.lines[tid_two]
		merged = None
		if one and two:
			merged = one.duplicate()
			merged.text += f" {two.text}"
			merged.start = one.start if one.start < two.start else two.start
			merged.end = one.end if one.end > two.end else two.end
			merged.previously_associated_tids.add(two.tid)
			merged.previously_associated_tids.update(two.previously_associated_tids)
			self.handle_event("merged", merged)
		return merged

	@property
	def lines_sorted(self):
		# sort by end first
		first_pass = sorted(self.lines.values(), key=lambda l: l.end)
		return sorted(first_pass, key=lambda l: l.start)
	

	def subscribe(self, events: list[str], listener: callable):
		if type(events) is str:
			events = [events]
		for event in events:
			if event in self.event_listeners:
				self.event_listeners[event].append(listener)
			else:
				print(f"Event {event} unknown and cannot be subscribed to")

	def unsubscribe(self, events: list[str], listener: callable):
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

	def to_text(self):
		return "\n".join(map(lambda l: l.text, self.lines_sorted))

	def to_srt(self):
		output = ""
		for i, line in enumerate(self.lines_sorted):
			output += f"{i+1}\n"
			output += line.format_elapsed_time(self.time_offset, False)
			output += f"{line.text}\n\n"
		return output;

	def to_webvtt(self):
		output = "WEBVTT\n\n"
		for i, line in enumerate(self.lines_sorted):
			output += f"{i+1}\n"
			output += line.format_elapsed_time(self.time_offset, True)
			output += f"{line.text}\n\n"
		return output;


class Line:
	def __init__(self, start: float, end: float, text: str = "", tid: str = None, previously_associated_tids: set = set()):
		if tid is None:
			tid = uuid.uuid4()
		assert start < end, "Start of line has to be before end"
		self.start = start
		self.end = end
		self.text = text
		self.tid = tid
		self.previously_associated_tids = previously_associated_tids
		self.uuid = uuid.uuid4()

	@classmethod
	def from_json(cls, data):
		data = json.loads(data)
		data["start"] = datetime.datetime.fromisoformat(data["start"]).timestamp()
		data["end"] = datetime.datetime.fromisoformat(data["end"]).timestamp()
		print(f"Loaded data: {data}")
		return cls(**data)

	def __str__(self):
		return json.dumps({
			"tid": self.tid,
			"start": datetime.datetime.fromtimestamp(self.start).isoformat(),
			"end": datetime.datetime.fromtimestamp(self.end).isoformat(),
			"text": self.text,
			"previously_associated_tids": self.previously_associated_tids,
		}, cls=UUIDEncoder)

	def duplicate(self):
		return Line(
			start=self.start,
			end=self.end,
			text=self.text,
			tid=None,
			previously_associated_tids=self.previously_associated_tids.union([self.tid]),
		)

	def format_elapsed_time(self, time_offset: float = 0.0, use_dot: bool = False):
		return f"{self.format_time(self.start - time_offset, use_dot)} --> {self.format_time(self.end - time_offset, use_dot)}\n"

	def format_time(self, time: float, use_dot: bool = False):
		sign = ""
		if time < 0:
			sign = "-"
			time = -time

		seconds = int(time/1000)
		milliseconds = int(time - (seconds * 1000))
		minutes = int(seconds/60)
		hours = int(minutes/60)
		days = int(hours/24)

		msep = "." if use_dot else ","

		hours = hours-(days*24)
		minutes = minutes-(days*24*60)-(hours*60)
		seconds = seconds-(days*24*60*60)-(hours*60*60)-(minutes*60)

		pad = lambda x: str(x).rjust(2, '0')
		pad3 = lambda x: str(x).rjust(3, '0')

		return f"{sign}{pad(hours)}:{pad(minutes)}:{pad(seconds)}{msep}{pad3(milliseconds)}"
		#return f"{str(hours).rjust(2, '0')}:{str(minutes).rjust(2, '0')}:{str(seconds).rjust(2, '0')}{milliseconds_separator}{str(milliseconds).rjust(3, '0')}"



class UUIDEncoder(json.JSONEncoder):
	def default(self, obj):
		if isinstance(obj, uuid.UUID):
			#return obj.hex
			return str(obj)
		return json.JSONEncoder.default(self, obj)
