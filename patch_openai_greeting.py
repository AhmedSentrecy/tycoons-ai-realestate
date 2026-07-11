from pathlib import Path
import re, json, gzip, base64

root = Path(__file__).resolve().parent
asset = root / 'asset_9.js'
if not asset.exists():
    raise FileNotFoundError('asset_9.js not found')

s = asset.read_text()
old = """      dc.addEventListener('open', function () {
        tycoonsOpenAIConnecting = false;
        tycoonsOpenAIActive = true;
        tycoonsOpenAIDispatch('agent');
      });"""
new = """      dc.addEventListener('open', function () {
        tycoonsOpenAIConnecting = false;
        tycoonsOpenAIActive = true;
        tycoonsOpenAIDispatch('agent');
        try {
          dc.send(JSON.stringify({
            type: 'response.create',
            response: {
              instructions: 'ابدئي المحادثة الآن بهذه الجملة فقط وبالعربي المصري الطبيعي: أهلاً بيك في Tycoons Investments، أنا سارة. قولي بتدور على عقار فين أو في مشروع إيه؟'
            }
          }));
        } catch (_) {}
      });"""
if old not in s:
    raise RuntimeError('Realtime data-channel open handler was not found')
s = s.replace(old, new, 1)
asset.write_text(s)

hashed = root / 'demos/tycoons-site/netlify/c774c742-6bc9-4360-b251-c48efef58e73'
if hashed.exists():
    hashed.write_text(s)


def patch_manifest(html_path):
    if not html_path.exists():
        return
    text = html_path.read_text()
    m = re.search(r'<script type="__bundler/manifest">(.*?)</script>', text, re.S)
    if not m:
        return
    manifest = json.loads(m.group(1))
    key = 'c774c742-6bc9-4360-b251-c48efef58e73'
    if key in manifest:
        raw = s.encode('utf-8')
        manifest[key]['data'] = base64.b64encode(gzip.compress(raw, compresslevel=9)).decode('ascii')
        manifest[key]['compressed'] = True
        manifest[key]['mime'] = manifest[key].get('mime') or 'text/javascript'
        patched = json.dumps(manifest, separators=(',', ':'))
        html_path.write_text(text[:m.start(1)] + patched + text[m.end(1):])


patch_manifest(root / 'index.html')
patch_manifest(root / 'demos/tycoons-site/netlify/index.html')
print('Tycoons Arabic realtime greeting patch applied')