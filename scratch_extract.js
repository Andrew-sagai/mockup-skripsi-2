const fs = require('fs');

const lines = fs.readFileSync('C:\\Users\\nuraida\\.gemini\\antigravity-ide\\brain\\d8aba181-2fa4-4218-ba5c-01c25d2429bf\\.system_generated\\logs\\transcript_full.jsonl', 'utf-8').trim().split('\n');

for (let i = lines.length - 1; i >= 0; i--) {
    try {
        const data = JSON.parse(lines[i]);
        if (data.type === 'USER_INPUT' && data.content.includes('PROMPT PERBAIKAN SISTEM')) {
            fs.writeFileSync('C:\\Users\\nuraida\\.gemini\\antigravity-ide\\brain\\d8aba181-2fa4-4218-ba5c-01c25d2429bf\\scratch\\last_prompt.md', data.content);
            console.log('Saved to last_prompt.md');
            break;
        }
    } catch (e) {}
}
