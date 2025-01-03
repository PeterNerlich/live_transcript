import json
import uuid
import datetime
import urllib.parse
import asyncio
import pytest
import requests
import requests_mock

from transcript import Transcript
from translator import DeepLTranslator

auth_dummy        = "abcdefghijklmnopqrstuvwxyz:fx"
auth_dummy_backup = "aabbccddeeffgghhiijjkkllmm:fx"

deepl_api_endpoint = "https://api-free.deepl.com/v2/translate"

def catchall(request, context):
	url = f"{request.scheme}//{request.hostname}{request.port}{request.path}{request.query}"
	assert False, f"Unexpected request to {url}"

adapter = requests_mock.Adapter()
adapter.register_uri(requests_mock.ANY, requests_mock.ANY, text=catchall)
session = requests.Session()
session.mount('', adapter)


@pytest.mark.asyncio
async def test_translate(requests_mock):
	de = Transcript("de")
	en = Transcript("en")
	translator = DeepLTranslator(de, en, auth_key=auth_dummy)

	counter = 0
	def callback(request, context):
		nonlocal counter
		counter += 1
		try:
			data = request.json()
		except json.JSONDecodeError:
			data = urllib.parse.parse_qs(request.text)
		assert data["auth_key"][0] == auth_dummy, "Request didn't contain the correct auth_key!"
		return {"translations": [{"text": f"translation {counter}"}]}

	requests_mock.post(deepl_api_endpoint, json=callback)

	de.add_line(start=0, end=1, text="one")
	await asyncio.sleep(.1)
	de.add_line(start=1, end=2, text="two")
	await asyncio.sleep(.1)
	de.add_line(start=2, end=3, text="three")
	await asyncio.sleep(.1)

	assert [line.text for line in en.lines_sorted] == ["translation 1", "translation 2", "translation 3"], "Translations not as expected"


@pytest.mark.asyncio
async def test_failover(requests_mock):
	de = Transcript("de")
	en = Transcript("en")
	translator = DeepLTranslator(de, en, auth_key=auth_dummy, backup_auth_key=auth_dummy_backup)

	counter = 0
	def callback(request, context):
		nonlocal counter
		counter += 1
		try:
			data = request.json()
		except json.JSONDecodeError:
			data = urllib.parse.parse_qs(request.text)
		if counter <= 2:
			assert data["auth_key"][0] == auth_dummy, "Request should send original auth key before failover!"
			if counter == 2:
				context.status_code = 429
				return "Beep boop budget used"
		else:
			assert data["auth_key"][0] == auth_dummy_backup, "Request should send backup auth key after failover!"
		return {"translations": [{"text": f"translation {counter}"}]}

	requests_mock.post(deepl_api_endpoint, json=callback)

	de.add_line(start=0, end=1, text="one")
	await asyncio.sleep(.1)
	de.add_line(start=1, end=2, text="two")
	await asyncio.sleep(.1)
	de.add_line(start=2, end=3, text="three")
	await asyncio.sleep(.1)

	assert [line.text for line in en.lines_sorted] == ["translation 1", "translation 3", "translation 4"], "Translations not as expected"
