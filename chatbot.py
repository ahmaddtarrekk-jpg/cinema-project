#!/usr/bin/env python3
import json
import random
import re
import sys


def parse_intent(text: str):
    value = text.lower().strip()
    if re.search(r"all movies|كل الافلام|اعرض كل", value):
        return {"type": "list_all"}
    if re.search(r"زهقان|bored", value):
        return {"type": "bored"}
    if re.search(r"drama|دراما", value):
        return {"type": "genre", "genre": "Drama"}
    if re.search(r"romance|رومانسي", value):
        return {"type": "genre", "genre": "Romance"}
    if re.search(r"action|اكشن", value):
        return {"type": "genre", "genre": "Action"}
    if re.search(r"comedy|كوميدي", value):
        return {"type": "genre", "genre": "Comedy"}
    return {"type": "mood", "keyword": value}


def build_reply(top):
    openers = [
        "تمام يا بطل ✨",
        "حلو جدًا 👌",
        "عندي لك اختيارات قوية 🎬",
        "جاهز! لقيت المناسب ليك 🔥",
    ]
    closers = [
        "تحب أفلتر حسب السعر؟",
        "ممكن أطلع لك أرخص تذاكر لو حابب.",
        "ولو حابب نوع معين قولّي وهنضيّق البحث أكثر.",
    ]
    lead = random.choice(openers)
    tail = random.choice(closers)
    if not top:
        return f"{lead} ملقتش نتائج قوية حالياً، لكن ممكن نجرب مود مختلف. {tail}"
    return f"{lead} لقيت {len(top)} ترشيحات مناسبة. أعلى تقييم حالياً {top[0]['movie']['title']} ({top[0]['movie']['rating']}). {tail}"


def main():
    raw = sys.stdin.read().strip()
    payload = json.loads(raw or "{}")

    message = payload.get("message", "")
    suggestions = payload.get("suggestions", [])

    intent = parse_intent(message)

    if intent["type"] == "list_all":
        filtered = suggestions
    elif intent["type"] == "bored":
        filtered = [s for s in suggestions if s.get("movie", {}).get("genre") in ["Comedy", "Action", "Sci-Fi"]]
    elif intent["type"] == "genre":
        filtered = [s for s in suggestions if s.get("movie", {}).get("genre") == intent["genre"]]
    else:
        keyword = intent.get("keyword", "")
        filtered = []
        for s in suggestions:
            movie = s.get("movie", {})
            genre = str(movie.get("genre", "")).lower()
            moods = [str(m).lower() for m in movie.get("moods", [])]
            if keyword in genre or any(m in keyword for m in moods):
                filtered.append(s)

    if not filtered:
        filtered = suggestions

    filtered.sort(key=lambda x: x.get("movie", {}).get("rating", 0), reverse=True)
    top = filtered[:12]

    print(json.dumps({
        "reply": build_reply(top),
        "suggestions": top
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
