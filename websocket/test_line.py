import json
import uuid
import datetime

from transcript import Line

def test_duplication():
	tid = uuid.uuid4()
	start = 2
	end = 5.3
	text = "abcdefg"
	previously_associated_tids = ["prev", "bla"]
	line = Line(start=start, end=end, text=text, tid=tid, previously_associated_tids=previously_associated_tids)

	cloned = line.duplicate()

	assert cloned.tid != tid, "Duplicated line should get new tid!"
	assert cloned.start == start, "Duplicated line should have same start!"
	assert cloned.end == end, "Duplicated line should have same end!"
	assert cloned.text == text, "Duplicated line should have same text!"
	assert set(cloned.previously_associated_tids) == set(previously_associated_tids + [tid]), "Duplicated line's previously_associated_tids should be original previously_associated_tids plus the original lines tid!"

	assert line.tid == tid, "Original line should still have the same tid!"
	assert line.start == start, "Original line should still have the same start!"
	assert line.end == end, "Original line should still have the same end!"
	assert line.text == text, "Original line should still have the same text!"
	assert set(line.previously_associated_tids) == set(previously_associated_tids), "Original line should still have the same previously_associated_tids!"


def test_json_import():
	tid = uuid.uuid4()
	start = datetime.datetime.now()
	end = start + datetime.timedelta(seconds=7.23109)
	text = '"bla bla"! öäü Що за...?'
	previously_associated_tids = ["prev", "id"]

	string = f'''
		{{
			"tid": "{tid}",
			"start": "{start.isoformat()}",
			"end": "{end.isoformat()}",
			"text": {json.dumps(text)},
			"previously_associated_tids": {json.dumps(previously_associated_tids)}
		}}
	'''

	line = Line.from_json(string)

	assert str(line.tid) == str(tid)
	assert line.start == start.timestamp()
	assert line.end == end.timestamp()
	assert line.text == text
	assert set(line.previously_associated_tids) == set(previously_associated_tids)


def test_json_export():
	tid = uuid.uuid4()
	start = datetime.datetime.now()
	end = start + datetime.timedelta(seconds=7.23109)
	text = '"bla bla"! öäü Що за...?'
	previously_associated_tids = ["prev", "id"]

	line = Line(start=start.timestamp(), end=end.timestamp(), text=text, tid=tid, previously_associated_tids=previously_associated_tids)
	string = str(line)
	data = json.loads(string)

	assert data["tid"] == str(tid)
	assert data["start"] == start.isoformat()
	assert data["end"] == end.isoformat()
	assert data["text"] == text
	assert set(data["previously_associated_tids"]) == set(previously_associated_tids)
