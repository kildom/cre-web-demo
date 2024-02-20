import gzip
import json
import sys
import urllib.request
import subprocess
from pathlib import Path

def log(s):
    print("[INFO]", s)
    sys.stdout.flush()

def run():
    subprocess.run([sys.executable, Path(__file__).parent / '../update_data_json.py'], cwd=Path(__file__).parent.parent, check=True)

    with open(Path(__file__).parent / '../data.json') as fd:
        data = json.load(fd)

    url = None
    for branch in data:
        log(f'Branch: {branch}')
        if branch['branch'] == "mozilla-release":
            url = branch['url']

    if url is None:
        raise ValueError("The 'data.json' file does not contain 'mozilla-release' branch.")

    log(f'URL: {url}')

    log('Downloading...')
    with urllib.request.urlopen(url) as u:
        data = u.read()
        log(f'Downloaded {len(data) / 1024}KB')
        if u.headers["Content-Encoding"] == "gzip":
            data = gzip.decompress(data)
        log(f'Uncompressed {len(data) / 1024}KB')

    log(f'Saving to {str(Path(__file__).parent / "../dist/js.wasm")}...')
    (Path(__file__).parent / '../dist').mkdir(parents=True, exist_ok=True)
    with open(Path(__file__).parent / '../dist/js.wasm', 'wb') as fd:
        fd.write(data)

    subprocess.run(['node', Path(__file__).parent / 'wasm-pack.mjs', 'pack'], cwd=Path(__file__).parent.parent, check=True)

run()
