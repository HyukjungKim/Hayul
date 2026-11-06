"""app/app.html(본문)을 감싸서 iPhone 홈 화면용 index.html을 만들어요."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
body = (ROOT / "app" / "app.html").read_text(encoding="utf-8")
head = """<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="하율이의 옷장">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="theme-color" content="#FFFBF5">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/icon-180.png">
<link rel="icon" href="icons/icon-192.png">
<style>html{box-sizing:border-box}:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
"""
(ROOT / "public" / "index.html").write_text(head + body + "\n</html>\n", encoding="utf-8")
print("built index.html")
