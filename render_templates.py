#!/usr/bin/env python3

import os
from pathlib import Path
from functools import lru_cache
import re
import datetime

script_dir = os.path.dirname(os.path.realpath(__file__))
static_dir = Path(script_dir, "static")
template_dir = Path(script_dir, "templates")
render_dir = Path(script_dir, "docroot")

pattern = re.compile(r'(src|href)="([^"]*)"')


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
		print(f"not replacing external or empty url:  {url}")
		return match.group(0)
	# add timestamp to urls
	if path.endswith((".html", ".css", ".js")):
		timestamp = get_timestamp(path)
		if query:
			query = f"{query}&v={timestamp}"
		else:
			query = f"?v={timestamp}"
	newurl = f"{path}{query}{anchor}"
	if url != newurl:
		print(f"replacing url: \t{url}\t→\t{newurl}")
	else:
		print(f"not replacing url: \t{url}")
	return f'{attr}="{newurl}"'

@lru_cache(maxsize=1024)
def get_timestamp(url):
	file = Path(render_dir, url)
	if os.path.isfile(file):
		timestamp = os.path.getmtime(file)
		return datetime.datetime.fromtimestamp(timestamp).isoformat()

def compose_docroot(render_dir, template_dir, static_dir=None):
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

	for template in Path(template_dir).rglob("*"):
		# read file
		filename = os.path.relpath(template, template_dir)
		destination = Path(render_dir, filename)
		print(f"{template} → {destination}")
		# extract URIs
		rendered = pattern.sub(render_url, template.read_text())
		# write to dest
		with open(destination, "w") as file:
			file.write(rendered)

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
	compose_docroot(render_dir=render_dir, template_dir=template_dir, static_dir=static_dir)
