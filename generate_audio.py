"""
Озвучка тренажёра DTZ B1 голосами Silero.

Запуск (один раз, на своём компьютере, в папке с сайтом):
    pip install torch soundfile
    python generate_audio.py

Скрипт сам находит все тексты Hören, диктанта, лексики и пример Sprechen 1
в файлах data.js / data2.js, озвучивает их и кладёт в папку audio/
вместе с audio/manifest.json. Сайт сам находит эти файлы и проигрывает их.
Если в файлах сайта поменялся текст, просто запустите скрипт ещё раз:
готовые файлы он пропустит.

Необязательно: если установлены pydub и ffmpeg (pip install pydub),
файлы сохраняются в MP3 (в несколько раз меньше, удобнее для GitHub).
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "audio")
SAMPLE_RATE = 24000

# Голоса сайта -> голоса Silero (немецкая модель v3_de).
# Мужские: bernd_ungerer, friedrich, karlsson. Женские: eva_k, hokuspokus.
VOICE_MAP = {
    "glassy": "eva_k",          # женский
    "airy": "hokuspokus",       # женский
    "buttery": "bernd_ungerer", # мужской
    "rounded": "karlsson",      # мужской
    None: "eva_k",              # диктант, лексика
}

STR = r'"((?:[^"\\]|\\.)*)"'

def unesc(s):
    return s.encode("utf-8").decode("unicode_escape").encode("latin-1").decode("utf-8") if "\\" in s else s

def fnv(text):  # тот же хэш, что в app.js
    h = 0x811C9DC5
    for b in text.encode("utf-8"):
        h ^= b
        h = (h * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}"

def collect():
    src = ""
    for f in ("data.js", "data2.js"):
        with open(os.path.join(HERE, f), encoding="utf-8") as fh:
            src += fh.read() + "\n"
    items = {}
    # Hören: {v:"voice",t:"text"}
    for v, t in re.findall(r'\{v:"(\w+)",t:' + STR + r'\}', src):
        items.setdefault(unesc(t), v)
    # Диктант: целые предложения + части для режима «медленно»
    m = re.search(r"const DIKTAT = \[(.*?)\];", src, re.S)
    if m:
        for t in re.findall(STR, m.group(1)):
            t = unesc(t)
            items.setdefault(t, None)
            for part in re.split(r",\s*|\s+(?=(?:und|weil|wenn|dass|ob|aber)\s)", t):
                if part:
                    items.setdefault(part, None)
    # Лексика: «слово. пример»
    m = re.search(r"const WORTSCHATZ = \{(.*?)\n\};", src, re.S)
    if m:
        for de, ex in re.findall(r'\["([^"]+)","[^"]+","([^"]+)"\]', m.group(1)):
            items.setdefault(f"{de}. {ex}", None)
    # Пример рассказа о себе
    m = re.search(r"muster:" + STR, src)
    if m:
        items.setdefault(unesc(m.group(1)), "glassy")
    return items

# --- Числа словами (Silero плохо читает цифры) ---
_E = ["null","eins","zwei","drei","vier","fünf","sechs","sieben","acht","neun","zehn","elf","zwölf","dreizehn","vierzehn","fünfzehn","sechzehn","siebzehn","achtzehn","neunzehn"]
_Z = {2:"zwanzig",3:"dreißig",4:"vierzig",5:"fünfzig",6:"sechzig",7:"siebzig",8:"achtzig",9:"neunzig"}
def num_de(n):
    if n < 20: return _E[n]
    if n < 100:
        e, z = n % 10, n // 10
        return (("ein" if e == 1 else _E[e]) + "und" if e else "") + _Z[z]
    if n < 1000:
        h, r = divmod(n, 100)
        return ("ein" if h == 1 else _E[h]) + "hundert" + (num_de(r) if r else "")
    if n < 10000:
        t, r = divmod(n, 1000)
        return ("ein" if t == 1 else _E[t]) + "tausend" + (num_de(r) if r else "")
    return " ".join(_E[int(d)] for d in str(n))
MONATE = "Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember"
def ordinal_de(n):
    special = {1: "ersten", 3: "dritten", 7: "siebten", 8: "achten"}
    if n in special: return special[n]
    return num_de(n) + ("sten" if n >= 20 else "ten")
def speakable(text):
    text = re.sub(r"\b112\b", "eins eins zwei", text)
    text = re.sub(r"(\d+)\.\s+(" + MONATE + r")", lambda m: ordinal_de(int(m.group(1))) + " " + m.group(2), text)
    text = re.sub(r"(\d+):(\d\d)", lambda m: num_de(int(m.group(1))) + " Uhr " + (num_de(int(m.group(2))) if int(m.group(2)) else ""), text)
    text = re.sub(r"\d+", lambda m: num_de(int(m.group(0))), text)
    text = text.replace("€", " Euro").replace("m²", " Quadratmeter")
    return text

def split_sentences(text, limit=800):
    parts, cur = [], ""
    for s in re.split(r"(?<=[.!?:])\s+", text):
        if len(cur) + len(s) > limit and cur:
            parts.append(cur); cur = s
        else:
            cur = (cur + " " + s).strip()
    if cur:
        parts.append(cur)
    return parts

def save_manifest(man_path, manifest):
    with open(man_path, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, indent=0)
    # Копия в виде JS — её браузер загружает и при открытии index.html двойным кликом (file://)
    with open(os.path.join(OUT, "manifest.js"), "w", encoding="utf-8") as fh:
        fh.write("window.AUDIO_MANIFEST=" + json.dumps(manifest, ensure_ascii=False) + ";")

def main():
    items = collect()
    print(f"Найдено текстов: {len(items)}")
    os.makedirs(OUT, exist_ok=True)
    man_path = os.path.join(OUT, "manifest.json")
    manifest = {}
    if os.path.exists(man_path):
        with open(man_path, encoding="utf-8") as fh:
            manifest = json.load(fh)

    todo = {t: v for t, v in items.items() if not (fnv(t) in manifest and os.path.exists(os.path.join(OUT, manifest[fnv(t)])))}
    if not todo:
        save_manifest(man_path, manifest)
        print("Все файлы уже есть. manifest.json и manifest.js обновлены.")
        return
    print(f"Нужно озвучить: {len(todo)}. Загружаю модель Silero (первый раз скачивается ~100 МБ)…")

    import torch, soundfile as sf
    torch.set_num_threads(max(1, os.cpu_count() or 1))
    model, _ = torch.hub.load(repo_or_dir="snakers4/silero-models", model="silero_tts", language="de", speaker="v3_de")
    speakers = list(getattr(model, "speakers", []))
    print("Голоса модели:", speakers)

    try:
        from pydub import AudioSegment
        use_mp3 = True
    except Exception:
        use_mp3 = False
        print("pydub не найден — сохраняю в WAV (файлы будут крупнее).")

    for i, (text, voice) in enumerate(todo.items(), 1):
        spk = VOICE_MAP.get(voice, VOICE_MAP[None])
        if speakers and spk not in speakers:
            spk = speakers[0]
        chunks = []
        for sent in split_sentences(speakable(text)):
            audio = model.apply_tts(text=sent, speaker=spk, sample_rate=SAMPLE_RATE)
            chunks.append(audio)
            chunks.append(torch.zeros(int(SAMPLE_RATE * 0.25)))
        wav = torch.cat(chunks).numpy()
        h = fnv(text)
        wav_path = os.path.join(OUT, h + ".wav")
        sf.write(wav_path, wav, SAMPLE_RATE)
        name = h + ".wav"
        if use_mp3:
            try:
                AudioSegment.from_wav(wav_path).export(os.path.join(OUT, h + ".mp3"), format="mp3", bitrate="64k")
                os.remove(wav_path)
                name = h + ".mp3"
            except Exception as e:
                print("  MP3 не получилось (нужен ffmpeg), оставляю WAV:", e)
                use_mp3 = False
        manifest[h] = name
        print(f"[{i}/{len(todo)}] {spk:14} {text[:70]}")
        if i % 10 == 0:
            save_manifest(man_path, manifest)

    save_manifest(man_path, manifest)
    print(f"Готово! Файлы в папке audio/ ({len(manifest)} шт.). Загрузите папку audio на GitHub вместе с сайтом.")

if __name__ == "__main__":
    sys.exit(main())
