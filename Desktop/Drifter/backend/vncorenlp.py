import sys
import io
import json
from py_vncorenlp import VnCoreNLP

# Force UTF-8 output encoding to fix Windows UnicodeEncodeError
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Load VnCoreNLP model
model = VnCoreNLP(save_dir=r"E:\Downloads\VnCoreNLP-1.2\VnCoreNLP-1.2")

def extract_location(text):
    annotations = model.annotate_text(text)
    location = None

    for sent in annotations.values():
        i = 0
        # First try NER-based extraction
        while i < len(sent):
            word = sent[i]
            if word['nerLabel'] in ('B-LOC', 'B-PER'):
                loc_tokens = [word['wordForm']]
                i += 1
                while i < len(sent) and sent[i]['nerLabel'] in ('I-LOC', 'I-PER'):
                    loc_tokens.append(sent[i]['wordForm'])
                    i += 1
                location = ' '.join(loc_tokens).replace('_', ' ')
                return location  # Exit immediately once location is found
            i += 1

        # Fallback: check for "Đường", "Phố", "Ngã", etc. with numbers or known patterns
        for i in range(len(sent) - 1):
            word1 = sent[i]['wordForm'].lower()
            word2 = sent[i+1]['wordForm']
            next_pos = sent[i+1]['posTag']

            # Special case for "Phố đi bộ" + something
            if word1 == 'phố' and word2.lower() == 'đi' and i+2 < len(sent):
                if sent[i+2]['wordForm'].lower() == 'bộ':
                    # Try grabbing next proper noun if exists
                    location_tokens = [sent[i]['wordForm'], sent[i+1]['wordForm'], sent[i+2]['wordForm']]
                    if i+3 < len(sent):
                        location_tokens.append(sent[i+3]['wordForm'])
                    location = ' '.join(location_tokens).replace('_', ' ')
                    return location

            # Fallback pattern: "Đường/Phố" + number or proper noun
            if word1 in ['đường', 'phố', 'ngã', 'cầu', 'hẻm']:
                if next_pos in ['N', 'M', 'Np']:  # noun/number/proper noun
                    location_tokens = [sent[i]['wordForm'], sent[i+1]['wordForm']]
                    if i+2 < len(sent) and sent[i+2]['posTag'] in ['M', 'Np']:
                        location_tokens.append(sent[i+2]['wordForm'])
                    location = ' '.join(location_tokens).replace('_', ' ')
                    return location

    return location

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({ "error": "No input text provided" }))
        sys.exit(1)

    description = sys.argv[1]

    # Remove surrounding quotes if any
    if description.startswith('"') and description.endswith('"'):
        description = description[1:-1]

    location = extract_location(description)

    result = {
        "location": location,
        "severity": description
    }

    print(json.dumps(result, ensure_ascii=False))

