import requests, json, sys, time, os

os.system('chcp 65001 >nul 2>&1')

API_KEY = "AIzaSyDMbaPlB3JeA3bQ7kltZoxkV9XruDOCndI"
pdf_path = sys.argv[1]
pdf_name = pdf_path.split('/')[-1]

# 上传 PDF
print(f"Uploading {pdf_name}...")
with open(pdf_path, "rb") as f:
    files = {"file": (pdf_name, f, "application/pdf")}
    r = requests.post(
        f"https://generativelanguage.googleapis.com/upload/v1beta/files?key={API_KEY}",
        files=files
    )

if r.status_code == 200:
    uri = r.json()["file"]["uri"]
    print(f"OK: {uri}")
    
    # 分析封面
    print("\nAnalyzing cover...")
    time.sleep(2)
    
    r = requests.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={API_KEY}",
        json={
            "contents": [{
                "parts": [
                    {"text": "Extract from PDF cover: title, author, subject (Math/English/Physics/etc), grade, publisher, publishDate. Return JSON only."},
                    {"file_data": {"file_uri": uri, "mime_type": "application/pdf"}}
                ]
            }],
            "generationConfig": {"responseMimeType": "application/json"}
        }
    )
    
    result = r.json()["candidates"][0]["content"]["parts"][0]["text"]
    print(json.dumps(json.loads(result), indent=2, ensure_ascii=False))
else:
    print(f"Error: {r.status_code}")
    print(r.text)
