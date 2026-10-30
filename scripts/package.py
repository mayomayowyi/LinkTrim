from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json

root = Path(__file__).resolve().parents[1]
out = root / 'dist'
out.mkdir(exist_ok=True)
common = [root / 'src' / name for name in ('background.js', 'cleaner.js', 'card-links.js', 'inline-buttons.js')]
icons = sorted((root / 'icons').glob('icon-*.png'))

for browser in ('chrome', 'firefox'):
    manifest = root / 'manifests' / f'{browser}.json'
    version = json.loads(manifest.read_text(encoding='utf-8'))['version']
    files = [(manifest, 'manifest.json')]
    files += [(p, p.name) for p in common]
    files += [(p, f'icons/{p.name}') for p in icons if p.stem.split('-')[1] in ('16', '32', '48', '128')]
    if browser == 'chrome':
        files += [(root / 'src' / name, name) for name in ('offscreen.js', 'offscreen.html')]
    output = out / f'LinkTrim-{browser}-v{version}.zip'
    with ZipFile(output, 'w', ZIP_DEFLATED) as z:
        for path, name in files:
            z.write(path, name)
    print(output)
