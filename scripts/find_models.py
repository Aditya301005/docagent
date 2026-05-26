import json

with open(r'C:\Users\adity\.gemini\antigravity-ide\brain\c3d7e5ab-5795-4eab-88ee-b279a028cd1d\.system_generated\steps\238\content.md', 'r', encoding='utf-8') as f:
    content = f.read()

# Skip the markdown header (first few lines) to get the JSON payload
json_start = content.find('{"data":')
if json_start != -1:
    json_data = json.loads(content[json_start:])
    for model in json_data.get('data', []):
        model_id = model.get('id', '')
        if 'free' in model_id.lower():
            input_modalities = model.get('architecture', {}).get('input_modalities', [])
            print(f"Found free model: {model_id} | Modalities: {input_modalities}")
