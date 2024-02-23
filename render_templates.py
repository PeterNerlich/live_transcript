#!/usr/bin/env python3

import os
from pathlib import Path
from functools import lru_cache
import re
import datetime
import subprocess

DEBUG = not (os.environ.get("DEBUG", "False").lower() in ('false', 'f', 'no', 'n', '0', ''))

script_dir = os.path.dirname(os.path.realpath(__file__))
static_dir = Path(script_dir, "static")
template_dir = Path(script_dir, "templates")
render_dir = Path(script_dir, "docroot")

pattern = re.compile(r'(src|href)="([^"]*)"')


def make_render_url_fn(log_replaced=None, log_kept=None, debug=False):
	if log_replaced is None:
		log_replaced = []
	if log_kept is None:
		log_kept = []

	def render_url(match):
		attr = match.group(1)
		url = match.group(2)
		# split off anchor and query part
		anchor_pos = url.index("#") if "#" in url else len(url)
		query_pos = url.index("?") if "?" in url else anchor_pos
		path = url[:query_pos]
		query = url[query_pos:anchor_pos]
		anchor = url[anchor_pos:]
		# no need replacing empty urls or those leading to external services
		if not url.strip() or url.startswith("http"):
			log_kept.append(url)
			if debug:
				print(f"not replacing external or empty url:  {url}")
			return match.group(0)
		# add timestamp to urls
		if path.endswith((".html", ".css", ".js", ".json")):
			timestamp = get_timestamp(path)
			if query:
				query = f"{query}&v={timestamp}"
			else:
				query = f"?v={timestamp}"
		newurl = f"{path}{query}{anchor}"
		if url != newurl:
			log_replaced.append((url, newurl))
			if debug:
				print(f"replacing url: \t{url}\t→\t{newurl}")
		else:
			log_kept.append(url)
			if debug:
				print(f"not replacing url: \t{url}")
		return f'{attr}="{newurl}"'

	return render_url

@lru_cache(maxsize=1024)
def get_timestamp(url):
	file = Path(render_dir, url)
	if os.path.isfile(file):
		timestamp = os.path.getmtime(file)
		return datetime.datetime.fromtimestamp(timestamp).isoformat()

def compose_docroot(render_dir, template_dir, static_dir=None, debug=False):
	render_dir = Path(render_dir)
	if render_dir.exists():
		if not render_dir.is_dir():
			render_dir.unlink()
			render_dir.mkdir()
	else:
		render_dir.mkdir()

	if static_dir is not None:
		for static in Path(static_dir).rglob("*"):
			filename = os.path.relpath(static, static_dir)
			destination = Path(render_dir, filename)
			if static.is_dir():
				ensure_dir(destination)
			else:
				ensure_removal(destination)
				# create link
				#destination.symlink_to(static)
				destination.hardlink_to(static)

	all_replaced = []
	all_kept = []
	for template in Path(template_dir).rglob("*"):
		replaced = []
		kept = []
		# read file
		filename = os.path.relpath(template, template_dir)
		destination = Path(render_dir, filename)
		# extract URIs
		rendered = pattern.sub(make_render_url_fn(replaced, kept, debug=debug), template.read_text())
		# write to dest
		with open(destination, "w") as file:
			file.write(rendered)

		if not debug:
			print(f"rendered {filename}, replaced {len(replaced)} and kept {len(kept)} links (replaced {len(set(replaced))} and kept {len(set(kept))} unique links)")
		else:
			print(f"rendered {template} → {destination}\nreplaced {len(replaced)} and kept {len(kept)} links (replaced {len(set(replaced))} and kept {len(set(kept))} unique links)")
			nl = "\n\t"
			lines = map(lambda x: f"{x[1]} ×\t{repr(x[0])}", aggregate(replaced).items())
			print(f"  replaced:{nl}{nl.join(lines)}")
			lines = map(lambda x: f"{x[1]} ×\t{repr(x[0])}", aggregate(kept).items())
			print(f"  kept:{nl}{nl.join(lines)}")
		all_replaced.extend(replaced)
		all_kept.extend(kept)

	print(f"\nReplaced {len(all_replaced)} and kept {len(kept)} links in total (replaced {len(set(replaced))} and kept {len(set(kept))} unique links)")
	if debug:
		nl = "\n\t"
		lines = map(lambda x: f"{x[1]} ×\t{repr(x[0])}", aggregate(all_replaced).items())
		print(f"  replaced:{nl}{nl.join(lines)}")
		lines = map(lambda x: f"{x[1]} ×\t{repr(x[0])}", aggregate(all_kept).items())
		print(f"  kept:{nl}{nl.join(lines)}")

def aggregate(items):
	d = dict()
	for item in items:
		if item not in d:
			d[item] = 1
		else:
			d[item] += 1
	return d

def ensure_dir(path):
	if path.exists():
		if not path.is_dir():
			path.unlink()
			path.mkdir()
	else:
		path.mkdir()

def ensure_removal(path):
	if path.exists():
		if path.is_file():
			path.unlink()
		else:
			path.rmdir()

if __name__ == '__main__':
	compose_docroot(render_dir=render_dir, template_dir=template_dir, static_dir=static_dir, debug=DEBUG)

	git = Path(script_dir, ".git")
	version_global = Path(script_dir, "version.json")
	version_target = Path(render_dir, "version.json")
	if git.exists() and git.is_dir():
		subprocess.call([Path(script_dir, "save_version_json.sh")], cwd=render_dir)
	elif version_global.exists() and version_global.is_file():
		version_global.copy(version_target)
		print("No .git directory, copied global version.json")
	else:
		print("Unable to generate version file! No .git directory and no global version.json")
