import json
from py_vncorenlp import VnCoreNLP

# Load VnCoreNLP model (adjust the path as needed)
model = VnCoreNLP(save_dir=r"E:\Downloads\VnCoreNLP-1.2\VnCoreNLP-1.2")

def test_sentence(sentence):
    annotations = model.annotate_text(sentence)
    # Pretty-print the full annotations dictionary as JSON
    print(json.dumps(annotations, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    test_sentence("lúc 5 giờ đường Nguyễn Xí đang kẹt")
