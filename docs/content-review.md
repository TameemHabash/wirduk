# Content review

Items found while building the content database, and the owner's decisions.
Applied changes are listed in [content-changes.md](content-changes.md) (generated).

Ids are source ids: `category:dhikr`, or `category:t` for a category title.

## A. Typos in titles and spacing — ✅ applied (owner approved 2026-10-16, content v2)

These are PDF-copy glitches in the source. They are not hadith wording, so Dorar cannot
confirm them. Each one showed a broken mark or a wrong letter on screen.

| # | Where | Before | After | Problem |
|---|---|---|---|---|
| A1 | 14:t | دعاء ُلبْس الثوب | دعاء لُبْس الثوب | The damma sat alone before the word (shown as a dotted circle). Moved onto ل. |
| A2 | 15:t | دعاء ُلبْس الثوب الجديد | دعاء لُبْس الثوب الجديد | Same as A1. |
| A3 | 46:t | الدعاء حينما يقع ما لا يرضاه أو ُ غلب على أمره | الدعاء حينما يقع ما لا يرضاه أو غُلب على أمره | Same: lone damma before غلب. |
| A4 | 104:t | الدعاء إذا نزل مترلا في سفر أو غيره | الدعاء إذا نزل منزلا في سفر أو غيره | Known PDF glitch: نز became تر. |
| A5 | 2:12 | تَنْزِيلَ السَّجْدَة ِ، | تَنْزِيلَ السَّجْدَةِ، | A space split the kasra from its letter. Only the space was removed. |

## B. Counts left at 1 — ✅ owner decision 2026-10-16: keep one tap

The count is how many taps finish a dhikr before the app moves to the next one.
These three items mention numbers, but they are a list of steps, not one phrase to
repeat. So the app asks for **one tap** after you finish all the steps.

| Where | Text (short) | Why it stays 1 |
|---|---|---|
| 31:1 | ينفث عن يساره (ثلاثاً) - يستعيذ بالله … (ثلاث مرات) - لا يحدث بها أحداً - يتحول عن جنبه | A list of four actions, not one phrase to repeat. |
| 118:1 | لما دنا النبي ﷺ من الصفا … قال مثل هذا ثلاث مرات | A description of what was done at Safa and Marwa. |
| 124:1 | ضع يدك … وقل: بسم الله، ثلاثاً، وقل سبع مرات: أعوذ بالله وقدرته … | Two phrases with different counts (3 and 7). |

## C. Unbalanced quote brackets (left as they are)

The book nests quotes inside quotes, and the PDF copy lost a few `((` or `))`.
This is only punctuation. I suggest leaving it unchanged.

33:1, 40:2, 84:1, 95:1, 118:1, 130:1

## D. Evening wording — ✅ applied (owner decision 2026-10-17, content v4)

In the evening category, these adhkar showed the morning wording plus the source's
evening note (e.g. `[وإذا أمسى قال: اللَّهم إني أمسيت...]`). Some notes were cut short.

1:3, 1:4, 1:6, 1:7, 1:15, 1:16 (shown in category 133 as 133003, 133004, 133006, 133007, 133015, 133016)

- **133003, 133004, 133016:** the evening words from Dorar (W1–W5), quoted exactly. Listed in
  [sources-review.md](sources-review.md) §6.
- **133006, 133007, 133015:** Dorar gives no evening words, so the owner gave them. For 133015
  the owner gave the opening; the rest is the book's own evening note.
- The bracket notes are removed from the evening text. The morning text is unchanged.
  Every change is in [content-changes.md](content-changes.md).

## E. Evening audio — to check

Since content v4 these evening adhkar show the evening words, but they still play the
same recording as the morning dhikr (the book has one recording per dhikr). Listen and
decide per dhikr: keep it, or turn its audio off in the evening.

### 133003 (morning: 1003)

- Evening text: ((أمسَينا وأمسى المُلكُ للَّهِ ، وَالْحَمْدُ لِلَّهِ، لاَ إِلَهَ إلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيرَ ما في هذه اللَّيلةِ وخَيرَ ما بَعدَها ، وَأَعُوذُ بِكَ مِنْ شَرِّ ما في هذه اللَّيلةِ وشَرِّ ما بَعدَها، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ)).
- Recording: `77.mp3` — [listen](https://tameemhabash.github.io/wirduk-audio/audio/ar/77.mp3)

### 133004 (morning: 1004)

- Evening text: ((اللَّهمَّ بكَ أمسَيْنا، وبكَ أصبَحْنا، وبكَ نَحْيا، وبكَ نموتُ، وإليكَ المصيرُ)).
- Recording: `78.mp3` — [listen](https://tameemhabash.github.io/wirduk-audio/audio/ar/78.mp3)

### 133006 (morning: 1006)

- Evening text: ((اللَّهُمَّ إني أمسيت أشهدك، وَأُشْهِدُ حَمَلَةَ عَرْشِكَ، وَمَلاَئِكَتِكَ، وَجَمِيعَ خَلْقِكَ، أَنَّكَ أَنْتَ اللَّهُ لَا إِلَهَ إِلاَّ أَنْتَ وَحْدَكَ لاَ شَرِيكَ لَكَ، وَأَنَّ مُحَمَّداً عَبْدُكَ وَرَسُولُكَ)) (أربعَ مَرَّاتٍ).
- Recording: `80.mp3` — [listen](https://tameemhabash.github.io/wirduk-audio/audio/ar/80.mp3)

### 133007 (morning: 1007)

- Evening text: ((اللَّهُمَّ مَا أمسى بي مِنْ نعمةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لاَ شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ)).
- Recording: `81.mp3` — [listen](https://tameemhabash.github.io/wirduk-audio/audio/ar/81.mp3)

### 133015 (morning: 1015)

- Evening text: ((أمسينا وأمسى الْمُلْكُ لِلَّهِ رَبِّ الْعَالَمِينَ، اللَّهم إني أسألك خير هذه الليلة: فتحها، ونصرها، ونورها، وبركتها، وهداها، وأعوذ بك من شر ما فيها، وشر ما بعدها)).
- Recording: `89.mp3` — [listen](https://tameemhabash.github.io/wirduk-audio/audio/ar/89.mp3)

### 133016 (morning: 1016)

- Evening text: ((أمسَيْنا على فِطرةِ الإسلامِ، وَعَلَى كَلِمَةِ الْإِخْلاَصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ صلى الله عليه وسلم، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ، حَنِيفاً مُسْلِماً وَمَا كَانَ مِنَ الْمُشرِكِينَ)).
- Recording: `90.mp3` — [listen](https://tameemhabash.github.io/wirduk-audio/audio/ar/90.mp3)
