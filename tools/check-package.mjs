import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const fail = message => { console.error(message); process.exitCode = 1; };
const manifest = JSON.parse(fs.readFileSync('manifest.json','utf8'));
if (manifest.manifest_version !== 3) fail('Expected Manifest V3');
if (!/^\d+(\.\d+){1,3}$/.test(manifest.version)) fail('Invalid version');
const files = ['index.html', manifest.background?.service_worker, ...Object.values(manifest.icons || {})];
const html = fs.readFileSync('index.html','utf8');
for (const m of html.matchAll(/(?:src|href)="([^"]+)"/g)) if (!/^(?:https?:|#|data:)/.test(m[1])) files.push(m[1]);
for (const file of files) if (!file || !fs.existsSync(file)) fail('Missing resource: '+file);
const scripts = ['background.js', ...fs.readdirSync('assets').filter(x=>x.endsWith('.js')).map(x=>'assets/'+x)];
for (const file of scripts) {
 const source = fs.readFileSync(file,'utf8');
 const run = spawnSync(process.execPath,['--input-type=module','--check'],{input:source,encoding:'utf8'});
 if (run.status !== 0) fail(file+': '+run.stderr);
 for (const m of source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)) if (!fs.existsSync(path.resolve(path.dirname(file),m[1]))) fail('Missing import: '+file+' -> '+m[1]);
}
for (const file of ['README.md','LICENSE','PRIVACY.md','SECURITY.md','CHANGELOG.md']) if (!fs.existsSync(file)) fail('Missing documentation: '+file);
if (!process.exitCode) console.log('Static package checks passed. Not a browser or security audit.');
