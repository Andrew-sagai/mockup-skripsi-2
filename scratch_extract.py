import json
import sys

with open(r'C:\Users\nuraida\.gemini\antigravity-ide\brain\d8aba181-2fa4-4218-ba5c-01c25d2429bf\.system_generated\logs\transcript_full.jsonl', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for line in reversed(lines):
    data = json.loads(line)
    if data.get('type') == 'USER_INPUT':
        print(data.get('content'))
        break
