import sys
import json
import speech_recognition as sr
from pydub import AudioSegment

# Set FFmpeg path (change path to your actual FFmpeg installation)
AudioSegment.converter = r"C:\ffmpeg-master-latest-win64-gpl-shared\bin\ffmpeg.exe"

def transcribe_audio(file_path):
    recognizer = sr.Recognizer()

    # Convert to WAV (force format detection)
    try:
        audio = AudioSegment.from_file(file_path)
        wav_path = file_path.replace(file_path.split('.')[-1], "wav")
        audio.export(wav_path, format="wav")
    except Exception as e:  
        return json.dumps({"text": f"Audio conversion failed: {str(e)}"})

    # Recognize speech
    with sr.AudioFile(wav_path) as source:
        audio_data = recognizer.record(source)

    try:
        text = recognizer.recognize_google(audio_data, language="vi-VN")
        return json.dumps({"text": text})
    except sr.UnknownValueError:
        return json.dumps({"text": "Could not understand the audio"})
    except sr.RequestError:
        return json.dumps({"text": "Speech recognition service error"})

if __name__ == "__main__":
    file_path = sys.argv[1]
    print(transcribe_audio(file_path))
