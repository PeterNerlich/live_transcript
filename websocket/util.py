
import os
from pathlib import Path
import json

script_dir = Path(os.path.dirname(os.path.realpath(__file__))).parent
version_file = Path(script_dir, "version.json")

try:
	with open(version_file, "r") as file:
		version = json.load(file)
except (json.decoder.JSONDecodeError, FileNotFoundError):
	version = dict()
