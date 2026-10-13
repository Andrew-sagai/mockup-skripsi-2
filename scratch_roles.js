const fs = require('fs');

const content = fs.readFileSync('c:/Users/nuraida/Downloads/surat/src/lib/api.ts', 'utf-8');
const lines = content.split('\n');

let currentFn = '';
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const matchFn = line.match(/const (api[A-Z]\w+) =/);
    if (matchFn) {
        currentFn = matchFn[1];
    }
    const matchRole = line.match(/validateRole\(([^)]+)\)/);
    if (matchRole && currentFn) {
        console.log(`${currentFn}: ${matchRole[1]}`);
    }
}
