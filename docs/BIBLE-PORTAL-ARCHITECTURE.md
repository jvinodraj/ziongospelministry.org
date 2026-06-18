# Bible Study Portal - Architecture Overview

## Portal Structure Visualization

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            HEADER & NAVIGATION                              │
│  🔤 Zion Gospel Ministry  [Home] [Bible] [Contact]  [🌙 Dark Mode]          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            📖 HERO SECTION                                   │
│                      Bible Study Portal                                       │
│       Explore Scripture in English and Tamil...                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                         🔍 SEARCH BAR                                        │
│  [ Search Bible... (e.g., John 3:16, love, faith) ]  [Search]               │
│  ═══════════════════════════════════════════════════════════════════════    │
│  Search Results (if any)                                                     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    NAVIGATION & VIEW CONTROLS                                │
│ ┌──────────────────────────────────────────────────────────────────────────┐│
│ │ Quick Navigation:                                                        ││
│ │ [Book: John ▼]  [Chapter: 3 ▼]  [Verse: 16 ▼]  [Go]                    ││
│ └──────────────────────────────────────────────────────────────────────────┘│
│ ┌──────────────────────────────────────────────────────────────────────────┐│
│ │ View Mode:                                                               ││
│ │ ○ Single Verse  ○ Chapter  ○ Parallel  ○ 🧘 Meditate  ○ 🎧 Audio       ││
│ └──────────────────────────────────────────────────────────────────────────┘│
│ ┌──────────────────────────────────────────────────────────────────────────┐│
│ │ Options:                                                                 ││
│ │ ☑ Verse Numbers   ☑ Reader Mode   ☑ Show Translations                  ││
│ └──────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────┬───────────────────────────────────────┐
│         MAIN CONTENT AREA         │           SIDEBAR (RIGHT)             │
├───────────────────────────────────┼───────────────────────────────────────┤
│                                   │                                       │
│  John 3:16                        │  📋 CHAPTER INFO                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │  ├─ Book: John                       │
│                                   │  ├─ Testament: New                    │
│  KING JAMES VERSION               │  ├─ Author: Apostle John              │
│  ¹⁶For God so loved the world,   │  ├─ Chapter: 3                        │
│  that he gave his only begotten   │  └─ Version: KJV                      │
│  Son...                           │                                       │
│                                   │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│  OVIYA VERSION (TAMIL)            │  📺 RELATED SERMONS                   │
│  தேவன் உலகத்தை...               │  ├─ The Love of God                  │
│  ...                              │  ├─ Salvation Through Christ          │
│                                   │  └─ Born Again Experience             │
│                                   │                                       │
│                                   │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━     │
│  [ACTION BUTTONS]                 │  🔤 TRANSLATION KEY                   │
│  🔊 Copy | 📋 Share | 📤 Copy     │  KJV: King James Version              │
│  🔖 Bookmark | ❤️ Favorite        │  OV:  Oviya Version (Tamil)           │
│                                   │                                       │
│  ← Previous  John 3:16  Next →    │                                       │
│                                   │                                       │
├───────────────────────────────────┴───────────────────────────────────────┤
│                      RELATED SCRIPTURES                                    │
│  ├─ Romans 5:8 - "But God commendeth his love..."                         │
│  ├─ 1 John 4:9 - "In this was manifested the love of God..."             │
│  ├─ Ephesians 2:8 - "For by grace are ye saved..."                       │
│  └─ Acts 4:12 - "Neither is there salvation in any other..."             │
├───────────────────────────────────────────────────────────────────────────┤
│                      TODAY'S VERSE                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ Psalm 23:1                                                          │  │
│  │ "The Lord is my shepherd; I shall not want."                        │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
├───────────────────────────────────────────────────────────────────────────┤
│                    READING PROGRESS                                        │
│  Old Testament:     ██████░░░░ 60%                                         │
│  New Testament:     ████████░░ 85%                                         │
├───────────────────────────────────────────────────────────────────────────┤
│                    BIBLE TOOLS (EXTENSIBLE)                                │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐              │
│  │📚 Reading Plans │ │🎯 Topic Explorer│ │📖 Commentaries │ ...          │
│  │Coming soon      │ │Coming soon      │ │Coming soon     │              │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘              │
└───────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            FOOTER                                           │
│  © 2026 Zion Gospel Ministry | Home | Bible Study | Contact | Sermons      │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
    JSON Data Files
         │
    ┌────┴──────┬──────────┬──────────┬──────────┐
    │            │          │          │          │
    ▼            ▼          ▼          ▼          ▼
  KJV Text    Tamil Text  Books    Verses    Sermons
  (700KB)    (700KB)   Metadata   Search      Data
             
             │
             ▼ Load on init()
             
    ┌─────────────────────────────┐
    │   BibleApp State            │
    ├─────────────────────────────┤
    │ bibleData: {}               │
    │ booksList: []               │
    │ sermonsList: []             │
    │ versesList: []              │
    │ currentBook/Chapter/Verse   │
    │ viewMode, showVerseNumbers  │
    └─────────────────────────────┘
    
             │
      ┌──────┼──────┬──────────┐
      │      │      │          │
      ▼      ▼      ▼          ▼
    Render View Mode  Search  Actions
    Content  Toggle   Results  (Copy,
             Logic            Share,
                               Listen)
             │
             └─────────────────┬──────────────┐
                               │              │
                               ▼              ▼
                           Display      localStorage
                           UI        (Bookmarks,
                                     Favorites,
                                     Progress)
```

## Component Interaction Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER INTERACTION FLOW                        │
└─────────────────────────────────────────────────────────────────┘

1. SELECT BOOK
   ┌──────────────┐
   │ Book Dropdown│ ──────────────────┐
   └──────────────┘                   │
                                      ▼
                        Populate Chapter Dropdown
                        with all chapters in book
                                      │
                                      ▼

2. SELECT CHAPTER
   ┌────────────────────┐
   │ Chapter Dropdown   │ ──────────────────┐
   └────────────────────┘                   │
                                            ▼
                        Populate Verse Dropdown
                        with all verses in chapter
                                            │
                                            ▼

3. SELECT VERSE (Optional)
   ┌──────────────────┐
   │ Verse Dropdown   │ ──────────────────┐
   └──────────────────┘                   │
                                          ▼
                        Click [Go] or change
                        View Mode to render
                                          │
                                          ▼

4. RENDER VERSE
   Based on selected View Mode:
   
   [Single Verse]          [Chapter]           [Parallel]
        │                      │                    │
        ├─ Show verse text   ├─ Show all       ├─ English column
        ├─ Optional verse #  │  verses in      ├─ Tamil column
        └─ Optional Tamil    │  chapter        └─ Scrollable
                             └─ Verse numbers
   
   [Meditation]            [Audio]
        │                      │
        ├─ Centered text    ├─ Play button
        ├─ Large font       ├─ Pause/Stop
        ├─ Minimal UI       ├─ Progress bar
        └─ Verse nav        └─ Text-to-speech

5. ENHANCE WITH SIDEBAR
   ├─ Chapter Info     (Book, testament, author)
   ├─ Related Sermons  (Auto-matched to passage)
   ├─ Translation Key  (Quick reference)
   └─ Related Verses   (Similar content)

6. USER ACTIONS
   ┌─────────────────┬──────────────┬─────────────┬──────────┬─────────┐
   │ 🔊 Listen       │ 📋 Copy      │ 📤 Share    │ 🔖 Book  │ ❤️ Fave │
   │ (TTS)           │ (Clipboard)  │ (Web Share) │ mark     │ rite    │
   │                 │              │             │ (Storage)│(Storage)│
   └─────────────────┴──────────────┴─────────────┴──────────┴─────────┘

7. SEARCH PATH
   [Search Box] ──────► Filter verses.json
                           │
                           ├─ Exact match? (e.g., "John 3:16")
                           ├─ Book match? (e.g., "John")
                           └─ Keyword match? (e.g., "love")
                                   │
                                   ▼
                        Show top 20 results
                                   │
                        Click result ──► navigateToVerse()
                                   │
                                   ▼
                        Populate selectors
                                   │
                                   ▼
                        Render verse
```

## View Mode Rendering Logic

```
┌────────────────────────────────────────────────────────────┐
│               View Mode Switch Logic                       │
└────────────────────────────────────────────────────────────┘

User selects view mode (radio button)
         │
         ▼
onViewModeChange()
         │
         ▼
renderCurrentVerse()
         │
    ┌────┴────┬────────┬─────────┬──────────┬──────────┐
    │          │        │         │          │          │
    ▼          ▼        ▼         ▼          ▼          ▼
single-verse chapter  parallel  meditation  audio    (default)
    │          │        │         │          │
    ├─ Show    ├─ Loop  ├─ Create ├─ Center ├─ Show
    │  one     │  all   │  two    │  verse  │  play
    │  verse   │  verses│  cols   │  text   │  controls
    │  only    │  with  │  side   │  only   │  + TTS
    │          │  verse │  by     │  +      │  UI
    │          │  nums  │  side   │  nav    │
    │          │        │  sync   │  only   │
    │          │        │         │         │
    └──────────┴────────┴─────────┴─────────┴─────────┘
              │
              ▼
    HTML Output ──► Rendered on Screen
```

## State Management

```
┌──────────────────────────────────────┐
│      BibleApp Global Object          │
├──────────────────────────────────────┤
│ Data:                                │
│  - bibleData: {en, ta}               │
│  - booksList: [...]                  │
│  - sermonsList: [...]                │
│  - versesList: [...]                 │
│                                      │
│ Current Selection:                   │
│  - currentBook                       │
│  - currentChapter                    │
│  - currentVerse                      │
│                                      │
│ UI State:                            │
│  - viewMode                          │
│  - showVerseNumbers                  │
│  - darkReaderMode                    │
│  - showTranslations                  │
│                                      │
│ Methods:                             │
│  - init()                            │
│  - loadData()                        │
│  - render[ViewMode]()                │
│  - navigate[Action]()                │
│  - [Action]Verse()                   │
│  - Helper methods                    │
└──────────────────────────────────────┘
         │
         ├─► DOM Updates
         ├─► localStorage Writes
         ├─► Browser API Calls
         │  (speechSynthesis, clipboard)
         └─► Display Rendering
```

## File Organization

```
ziongospelministry.org/
│
├── index.html ......................... Home page (nav updated)
├── bible-reader.html .................. 🆕 Main portal page
├── contact.html ....................... Contact page (nav updated)
│
├── assets/
│   ├── css/
│   │   ├── style.css .................. Main site styles
│   │   └── bible-reader.css ........... 🆕 Portal styles (1000+ lines)
│   │
│   ├── js/
│   │   ├── site.js .................... Main site JS
│   │   └── bible-reader.js ............ Portal JavaScript
│   │
│   └── data/
│       ├── verses.json ................ Verse search DB
│       ├── sermons.json ............... Sermons data
│       ├── devotions.json ............. Devotions
│       └── ...
│
├── bible-data/
│   ├── bible-en-kjv.json .............. KJV English (700KB)
│   ├── bible-ta-ov.json ............... Tamil Oviya (700KB)
│   ├── Books.json ..................... Books metadata
│   └── ...
│
└── docs/
    └── BIBLE-STUDY-PORTAL.md .......... 🆕 Full documentation
```

---

**Portal fully functional and ready for testing!**
