# -*- coding: utf-8 -*-
"""从用户上传的问诊系统 docx 中提取全文文本，落盘供实现引用。"""
import zipfile, re, sys

DOCX = r"c:\Users\多吃蛋挞\Desktop\问诊\24网络2_王博康40号 _问诊系统（含网页版）.docx"
OUT = r"c:\StarWind6.0\xiaobb20261016\medical\_docx_原文.txt"

z = zipfile.ZipFile(DOCX)
xml = z.read("word/document.xml").decode("utf-8")

# 按段落切分，拼接每段内的 <w:t> 文本
paras = re.findall(r"<w:p[ >].*?</w:p>", xml, re.S)
lines = []
for p in paras:
    texts = re.findall(r"<w:t[^>]*>([^<]*)</w:t>", p)
    line = "".join(texts).strip()
    if line:
        lines.append(line)

text = "\n".join(lines)
with open(OUT, "w", encoding="utf-8") as f:
    f.write(text)

sys.stdout.reconfigure(encoding="utf-8")
print("paras:", len(lines), "chars:", len(text))
