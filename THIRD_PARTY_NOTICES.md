# 출처와 라이선스 (Third-party notices)

이 사이트(해서 → 소전 변환기)는 아래 자료와 프로그램을 사용합니다.
자료마다 라이선스가 다르며, 각 자료에는 그 자료의 라이선스가 그대로 적용됩니다.

| 자료 | 파일 | 라이선스 |
|---|---|---|
| 1. 崇羲篆體 說文 소전 그림 | `shuowen/`, `shuowen.js` | CC BY-ND 3.0 TW 이후 버전 |
| 2. 開元小篆 소전 그림(SVG) | 인터넷에서 불러옴 (저장소에 없음) | SIL Open Font License 1.1 |
| 3. Unicode Unihan Database 18.0 | `shuowen.js`(보충 음), `bushou.js` | Unicode License v3 |
| 4. libhangul 한자 사전 | `hanja.txt` | BSD 3-Clause |
| 5. HanziLookupJS 손글씨 인식 | `hwr/` | GNU GPL v3 / Arphic Public License |
| 6. Noto Serif KR·TC 글꼴 | Google Fonts에서 불러옴 (저장소에 없음) | SIL Open Font License 1.1 |
| 7. 최규화 『설문해자 540부수의 자형 분해』 | `bunhae/s/`, `bunhae/data.js` | 저작권은 저자에게 있음 — 저자의 허락을 받아 게시 |
| 8. 한자해례 채널 「기초자81」 영상 | `bunhae/k/`, `bunhae/data.js` | 저작권은 저자에게 있음 — 저자의 허락을 받아 게시 |
| 9. shuowen.org 說文解字 데이터 | `bunhae/shuowen-text.js` | Apache License 2.0 |
| 이 사이트의 코드 | `index.html`, `script.js`, `style.css`, `sw.js` 등 | GNU GPL v3 (`LICENSE`) |

---

## 1. 崇羲篆體 (Chong Xi Small Seal) — 說文 원본 소전 그림

- 저작자: 王心怡、季旭昇 (제작 협력: 謝清俊、莊德明)
- 발행: 中央研究院 小學堂 (Academia Sinica)
- 원본: 崇羲篆體字形表(《說文解字》) — <https://xiaoxue.iis.sinica.edu.tw/chongxi/>
- 라이선스: 創用CC 姓名標示-禁止改作 3.0 台灣 및 이후 버전 (CC BY-ND 3.0 TW or later)
  — <https://creativecommons.org/licenses/by-nd/3.0/tw/>

이 사이트의 `shuowen/p001.png` ~ `p104.png`는 崇羲篆體字形表의 소전 칸을 글자 단위로 잘라
원본 쪽마다 한 장에 모은 것입니다. **글자의 모양(획)은 고치지 않았습니다.** 화면에 보여줄 때
바탕을 투명하게 하고 색을 밝게 뒤집어 표시할 뿐입니다. 이 그림을 다시 사용하시는 경우에도
위 저작자 표시와 라이선스를 지켜 주시고, 글자 모양을 수정하지 마십시오.

## 2. 開元小篆 (Kaiyuan Small Seal Font) — 소전 그림(SVG)

- Copyright (c) 2026 Kaiyuan Small Seal Font Contributors — <https://github.com/frankslin/kaiyuan-small-seal-font>
- 라이선스: SIL Open Font License 1.1 — <https://openfontlicense.org/>
- 이 사이트는 글자 그림(SVG)을 아래 저장소에서 jsDelivr를 거쳐 불러와 보여줍니다. 파일을 저장소에 복사해 두지는 않습니다.
  <https://github.com/UltraBriefnessCinema/kaiyuan-small-seal-font/tree/add_THX_png>
- `data.js`(해서 → 소전 코드 대응표)의 소전 코드는 Unicode 18.0 篆書(Seal) 블록(U+3D000–U+3FC3F)의 번호입니다.

## 3. Unicode Unihan Database 18.0

`shuowen.js`의 보충 음(`EXTRA_YIN`)과 `bushou.js`의 부수·획수는 Unihan Database 18.0
(`Unihan_Readings.txt`, `Unihan_IRGSources.txt`, `Unihan_Variants.txt`)에서 뽑아 만들었습니다.
원본 파일: © 2026 Unicode®, Inc. Unicode and the Unicode Logo are registered trademarks of Unicode, Inc. in the U.S. and other countries.

```
UNICODE LICENSE V3

COPYRIGHT AND PERMISSION NOTICE

Copyright © 1991-2023 Unicode, Inc.

NOTICE TO USER: Carefully read the following legal agreement. BY
DOWNLOADING, INSTALLING, COPYING OR OTHERWISE USING DATA FILES, AND/OR
SOFTWARE, YOU UNEQUIVOCALLY ACCEPT, AND AGREE TO BE BOUND BY, ALL OF THE
TERMS AND CONDITIONS OF THIS AGREEMENT. IF YOU DO NOT AGREE, DO NOT
DOWNLOAD, INSTALL, COPY, DISTRIBUTE OR USE THE DATA FILES OR SOFTWARE.

Permission is hereby granted, free of charge, to any person obtaining a
copy of data files and any associated documentation (the "Data Files") or
software and any associated documentation (the "Software") to deal in the
Data Files or Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, and/or sell
copies of the Data Files or Software, and to permit persons to whom the
Data Files or Software are furnished to do so, provided that either (a)
this copyright and permission notice appear with all copies of the Data
Files or Software, or (b) this copyright and permission notice appear in
associated Documentation.

THE DATA FILES AND SOFTWARE ARE PROVIDED "AS IS", WITHOUT WARRANTY OF ANY
KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF
THIRD PARTY RIGHTS.

IN NO EVENT SHALL THE COPYRIGHT HOLDER OR HOLDERS INCLUDED IN THIS NOTICE
BE LIABLE FOR ANY CLAIM, OR ANY SPECIAL INDIRECT OR CONSEQUENTIAL DAMAGES,
OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS,
WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION,
ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THE DATA
FILES OR SOFTWARE.

Except as contained in this notice, the name of a copyright holder shall
not be used in advertising or otherwise to promote the sale, use or other
dealings in these Data Files or Software without prior written
authorization of the copyright holder.
```

## 4. libhangul 한자 사전 (`hanja.txt`)

`hanja.txt`는 libhangul의 `data/hanja/hanja.txt`에서 한 글자 한자 항목만 골라 낸 것입니다.
원본의 저작권·라이선스 고지는 파일 맨 위에 그대로 남겨 두었습니다.
— <https://github.com/libhangul/libhangul>

```
Copyright (c) 2005,2006 Choe Hwanjin
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.
3. Neither the name of the author nor the names of its contributors
   may be used to endorse or promote products derived from this software
   without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
```

## 5. HanziLookupJS — 손글씨 인식 (`hwr/`)

- 저작자: Gábor L Ugray — <https://github.com/gugray/HanziLookupJS> (커밋 b21124f)
- Jordan Kiang의 HanziLookup(<http://kiang.org/jordan/software/hanzilookup>)을 바탕으로 한 프로그램입니다.
- `hwr/hanzilookup.min.js`, `hwr/orig.json`: GNU GPL v3 — `hwr/LICENSE-GPL.txt`
  - 압축하기 전 원본 소스 코드는 `hwr/src/`에 함께 들어 있습니다. (`gulpfile.js`의 순서대로 이어 붙여 압축한 것이 `hanzilookup.min.js`입니다.)
- `hwr/mmah.json`: Make Me a Hanzi(<https://github.com/skishore/makemeahanzi>)의 자료에서 만든 것으로,
  Arphic PL KaitiM GB, Arphic PL UKai 글꼴에서 나왔습니다. Arphic Public License — `hwr/LICENSE-APL.txt`

## 6. Noto Serif KR / Noto Serif TC 글꼴

Google Fonts(<https://fonts.google.com/>)에서 불러와 쓰며, 저장소에 복사해 두지는 않습니다.
SIL Open Font License 1.1.

## 7. 최규화, 『설문해자 540부수의 자형 분해』

- 저자: 최규화 · 발행: 도서출판 한자해례 · ISBN 979-11-979362-7-2 · 저본: 〔漢〕許慎《說文解字》(中華書局, 1985, 平津館叢書本 影印)
- `bunhae/s/00.webp` ~ `14.webp`는 책의 540부수 분해표를 쪽에서 잘라 이어 붙인 그림입니다. 내용은 고치지 않았습니다.
- **저작권은 저자에게 있으며, 저자의 허락을 받아 이 사이트에 게시합니다. 이 저장소의 GPL v3 라이선스는 이 자료에 적용되지 않습니다.**
  허락 없이 내용 일부를 인용하거나 발췌하는 것을 금합니다(책 판권면).

## 8. 한자해례 채널 「[한자해례1800+] 기초자81 (압축 버전, 20분)」

- 최규화, 2023-10-14, <https://www.youtube.com/watch?v=OjKvkfoToC4>
- `bunhae/k/`의 그림은 영상 화면을 잘라 낸 것이고, `bunhae/data.js`의 뜻·해체 설명은 화면 글자와 자동 자막을 옮긴 것입니다(받아쓰기 오류가 있을 수 있음).
- **저작권은 저자에게 있으며, 저자의 허락을 받아 게시합니다. GPL v3는 적용되지 않습니다.**

## 9. shuowen.org 說文解字 데이터

- Copyright 2019 Shuowen.org — <https://github.com/shuowenjiezi/shuowen>
- Apache License 2.0 — 전문: `bunhae/LICENSE-shuowen-Apache-2.0.txt`
- `bunhae/shuowen-text.js`는 이 데이터의 표제자·부수·원문을 정리하고, 원문의 구성(从○○聲)을 자동으로 뽑아 덧붙인 것입니다(변경 사항).

---

## 이 사이트의 코드

`index.html`, `script.js`, `style.css`, `sw.js`, `manifest.webmanifest`와 자료를 만드는 데 쓴 코드는
GNU General Public License v3(`LICENSE`)로 공개합니다. 손글씨 인식 프로그램(GPL v3)과 함께 동작하므로
같은 라이선스를 적용했습니다. 위 1~9의 자료에는 이 라이선스가 아니라 각 자료의 라이선스·저작권이 적용됩니다.

Copyright (C) 2026 MEDITATOR-farm
