/**
 * Bible Study Portal — Multi-Translation Sample Data
 * English : KJV (full from bible-data/), NKJV, NIV, ESV (sample verses)
 * Tamil   : Parisudha Vedhagamam / PV (sample verses)
 *
 * For KJV, the portal loads full JSON from bible-data/ at runtime and
 * uses the object below only as a quick fallback / demo.
 * NKJV / NIV / ESV / PV sample passages are embedded here for
 * immediate display; full datasets to be integrated later via API.
 */

(function () {
  "use strict";

  /* ================================================================
   * SHARED PASSAGE KEYS (chapters / verses present in sample data)
   * ================================================================ */
  const BOOKS_SAMPLE = [
    { name: "Genesis",   slug: "genesis",   file: "Genesis.json",   testament: "ot", chapters: 50  },
    { name: "Exodus",    slug: "exodus",    file: "Exodus.json",    testament: "ot", chapters: 40  },
    { name: "Psalms",    slug: "psalms",    file: "Psalms.json",    testament: "ot", chapters: 150 },
    { name: "Proverbs",  slug: "proverbs",  file: "Proverbs.json",  testament: "ot", chapters: 31  },
    { name: "Isaiah",    slug: "isaiah",    file: "Isaiah.json",    testament: "ot", chapters: 66  },
    { name: "Matthew",   slug: "matthew",   file: "Matthew.json",   testament: "nt", chapters: 28  },
    { name: "John",      slug: "john",      file: "John.json",      testament: "nt", chapters: 21  },
    { name: "Acts",      slug: "acts",      file: "Acts.json",      testament: "nt", chapters: 28  },
    { name: "Romans",    slug: "romans",    file: "Romans.json",    testament: "nt", chapters: 16  },
    { name: "Ephesians", slug: "ephesians", file: "Ephesians.json", testament: "nt", chapters: 6   },
    { name: "1 Peter",   slug: "1-peter",   file: "1Peter.json",    testament: "nt", chapters: 5   }
  ];

  /* ================================================================
   * ENGLISH — King James Version (KJV)
   * ================================================================ */
  const KJV = {
    "Genesis": {
      "1": {
        "1": "In the beginning God created the heaven and the earth.",
        "2": "And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters.",
        "3": "And God said, Let there be light: and there was light.",
        "4": "And God saw the light, that it was good: and God divided the light from the darkness."
      },
      "2": {
        "1": "Thus the heavens and the earth were finished, and all the host of them.",
        "2": "And on the seventh day God ended his work which he had made; and he rested on the seventh day from all his work which he had made.",
        "3": "And God blessed the seventh day, and sanctified it: because that in it he had rested from all his work which God created and made."
      }
    },
    "Exodus": {
      "3": {
        "13": "And Moses said unto God, Behold, when I come unto the children of Israel, and shall say unto them, The God of your fathers hath sent me unto you; and they shall say to me, What is his name? what shall I say unto them?",
        "14": "And God said unto Moses, I AM THAT I AM: and he said, Thus shalt thou say unto the children of Israel, I AM hath sent me unto you."
      }
    },
    "Psalms": {
      "23": {
        "1": "The LORD is my shepherd; I shall not want.",
        "2": "He maketh me to lie down in green pastures: he leadeth me beside the still waters.",
        "3": "He restoreth my soul: he leadeth me in the paths of righteousness for his name's sake.",
        "4": "Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.",
        "5": "Thou preparest a table before me in the presence of mine enemies: thou anointest my head with oil; my cup runneth over.",
        "6": "Surely goodness and mercy shall follow me all the days of my life: and I will dwell in the house of the LORD for ever."
      },
      "46": {
        "1": "God is our refuge and strength, a very present help in trouble.",
        "2": "Therefore will not we fear, though the earth be removed, and though the mountains be carried into the midst of the sea;"
      }
    },
    "Proverbs": {
      "3": {
        "5": "Trust in the LORD with all thine heart; and lean not unto thine own understanding.",
        "6": "In all thy ways acknowledge him, and he shall direct thy paths.",
        "7": "Be not wise in thine own eyes: fear the LORD, and depart from evil.",
        "8": "It shall be health to thy navel, and marrow to thy bones."
      }
    },
    "Isaiah": {
      "40": {
        "31": "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint."
      }
    },
    "Matthew": {
      "5": {
        "3": "Blessed are the poor in spirit: for theirs is the kingdom of heaven.",
        "4": "Blessed are they that mourn: for they shall be comforted.",
        "5": "Blessed are the meek: for they shall inherit the earth.",
        "6": "Blessed are they which do hunger and thirst after righteousness: for they shall be filled.",
        "7": "Blessed are the merciful: for they shall obtain mercy.",
        "8": "Blessed are the pure in heart: for they shall see God.",
        "9": "Blessed are the peacemakers: for they shall be called the children of God."
      }
    },
    "John": {
      "1": {
        "1": "In the beginning was the Word, and the Word was with God, and the Word was God.",
        "2": "The same was in the beginning with God.",
        "3": "All things were made by him; and without him was not any thing made that was made.",
        "4": "In him was life; and the life was the light of men.",
        "5": "And the light shineth in darkness; and the darkness comprehended it not.",
        "14": "And the Word was made flesh, and dwelt among us, (and we beheld his glory, the glory as of the only begotten of the Father,) full of grace and truth."
      },
      "3": {
        "16": "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
        "17": "For God sent not his Son into the world to condemn the world; but that the world through him might be saved.",
        "18": "He that believeth on him is not condemned: but he that believeth not is condemned already, because he hath not believed in the name of the only begotten Son of God."
      },
      "14": {
        "6": "Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me."
      }
    },
    "Acts": {
      "2": {
        "38": "Then Peter said unto them, Repent, and be baptized every one of you in the name of Jesus Christ for the remission of sins, and ye shall receive the gift of the Holy Ghost.",
        "39": "For the promise is unto you, and to your children, and to all that are afar off, even as many as the Lord our God shall call."
      }
    },
    "Romans": {
      "3": {
        "23": "For all have sinned, and come short of the glory of God;",
        "24": "Being justified freely by his grace through the redemption that is in Christ Jesus:"
      },
      "5": {
        "8": "But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us.",
        "9": "Much more then, being now justified by his blood, we shall be saved from wrath through him."
      },
      "8": {
        "28": "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.",
        "38": "For I am persuaded, that neither death, nor life, nor angels, nor principalities, nor powers, nor things present, nor things to come,",
        "39": "Nor height, nor depth, nor any other creature, shall be able to separate us from the love of God, which is in Christ Jesus our Lord."
      }
    },
    "Ephesians": {
      "2": {
        "8": "For by grace are ye saved through faith; and that not of yourselves: it is the gift of God:",
        "9": "Not of works, lest any man should boast.",
        "10": "For we are his workmanship, created in Christ Jesus unto good works, which God hath before ordained that we should walk in them."
      }
    },
    "1 Peter": {
      "5": {
        "7": "Casting all your care upon him; for he careth for you.",
        "8": "Be sober, be vigilant; because your adversary the devil, as a roaring lion, walketh about, seeking whom he may devour:"
      }
    }
  };

  /* ================================================================
   * ENGLISH — New King James Version (NKJV)  — sample verses
   * ================================================================ */
  const NKJV = {
    "Genesis": {
      "1": {
        "1": "In the beginning God created the heavens and the earth.",
        "2": "The earth was without form, and void; and darkness was on the face of the deep. And the Spirit of God was hovering over the face of the waters.",
        "3": "Then God said, \"Let there be light\"; and there was light.",
        "4": "And God saw the light, that it was good; and God divided the light from the darkness."
      }
    },
    "Psalms": {
      "23": {
        "1": "The LORD is my shepherd; I shall not want.",
        "2": "He makes me to lie down in green pastures; He leads me beside the still waters.",
        "3": "He restores my soul; He leads me in the paths of righteousness for His name's sake.",
        "4": "Yea, though I walk through the valley of the shadow of death, I will fear no evil; for You are with me; Your rod and Your staff, they comfort me.",
        "5": "You prepare a table before me in the presence of my enemies; You anoint my head with oil; my cup runs over.",
        "6": "Surely goodness and mercy shall follow me all the days of my life; and I will dwell in the house of the LORD forever."
      }
    },
    "Proverbs": {
      "3": {
        "5": "Trust in the LORD with all your heart, and lean not on your own understanding;",
        "6": "In all your ways acknowledge Him, and He shall direct your paths."
      }
    },
    "Isaiah": {
      "40": {
        "31": "But those who wait on the LORD shall renew their strength; they shall mount up with wings like eagles, they shall run and not be weary, they shall walk and not faint."
      }
    },
    "John": {
      "1": {
        "1": "In the beginning was the Word, and the Word was with God, and the Word was God.",
        "2": "He was in the beginning with God.",
        "3": "All things were made through Him, and without Him nothing was made that was made.",
        "4": "In Him was life, and the life was the light of men.",
        "5": "And the light shines in the darkness, and the darkness did not comprehend it.",
        "14": "And the Word became flesh and dwelt among us, and we beheld His glory, the glory as of the only begotten of the Father, full of grace and truth."
      },
      "3": {
        "16": "For God so loved the world that He gave His only begotten Son, that whoever believes in Him should not perish but have everlasting life.",
        "17": "For God did not send His Son into the world to condemn the world, but that the world through Him might be saved.",
        "18": "He who believes in Him is not condemned; but he who does not believe is condemned already, because he has not believed in the name of the only begotten Son of God."
      },
      "14": {
        "6": "Jesus said to him, \"I am the way, the truth, and the life. No one comes to the Father except through Me.\""
      }
    },
    "Romans": {
      "3": {
        "23": "For all have sinned and fall short of the glory of God,",
        "24": "being justified freely by His grace through the redemption that is in Christ Jesus,"
      },
      "5": {
        "8": "But God demonstrates His own love toward us, in that while we were still sinners, Christ died for us.",
        "9": "Much more then, having now been justified by His blood, we shall be saved from wrath through Him."
      },
      "8": {
        "28": "And we know that all things work together for good to those who love God, to those who are the called according to His purpose.",
        "38": "For I am persuaded that neither death nor life, nor angels nor principalities nor powers, nor things present nor things to come,",
        "39": "nor height nor depth, nor any other created thing, shall be able to separate us from the love of God which is in Christ Jesus our Lord."
      }
    },
    "Ephesians": {
      "2": {
        "8": "For by grace you have been saved through faith, and that not of yourselves; it is the gift of God,",
        "9": "not of works, lest anyone should boast.",
        "10": "For we are His workmanship, created in Christ Jesus for good works, which God prepared beforehand that we should walk in them."
      }
    },
    "1 Peter": {
      "5": {
        "7": "casting all your care upon Him, for He cares for you.",
        "8": "Be sober, be vigilant; because your adversary the devil walks about like a roaring lion, seeking whom he may devour."
      }
    }
  };

  /* ================================================================
   * ENGLISH — New International Version (NIV) — sample verses
   * ================================================================ */
  const NIV = {
    "Genesis": {
      "1": {
        "1": "In the beginning God created the heavens and the earth.",
        "2": "Now the earth was formless and empty, darkness was over the surface of the deep, and the Spirit of God was hovering over the waters.",
        "3": "And God said, \"Let there be light,\" and there was light.",
        "4": "God saw that the light was good, and he separated the light from the darkness."
      }
    },
    "Psalms": {
      "23": {
        "1": "The LORD is my shepherd, I lack nothing.",
        "2": "He makes me lie down in green pastures, he leads me beside quiet waters,",
        "3": "he refreshes my soul. He guides me along the right paths for his name's sake.",
        "4": "Even though I walk through the darkest valley, I will fear no evil, for you are with me; your rod and your staff, they comfort me.",
        "5": "You prepare a table before me in the presence of my enemies. You anoint my head with oil; my cup overflows.",
        "6": "Surely your goodness and love will follow me all the days of my life, and I will dwell in the house of the LORD forever."
      }
    },
    "Proverbs": {
      "3": {
        "5": "Trust in the LORD with all your heart and lean not on your own understanding;",
        "6": "in all your ways submit to him, and he will make your paths straight."
      }
    },
    "Isaiah": {
      "40": {
        "31": "but those who hope in the LORD will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint."
      }
    },
    "John": {
      "1": {
        "1": "In the beginning was the Word, and the Word was with God, and the Word was God.",
        "2": "He was with God in the beginning.",
        "3": "Through him all things were made; without him nothing was made that has been made.",
        "4": "In him was life, and that life was the light of all mankind.",
        "5": "The light shines in the darkness, and the darkness has not overcome it.",
        "14": "The Word became flesh and made his dwelling among us. We have seen his glory, the glory of the one and only Son, who came from the Father, full of grace and truth."
      },
      "3": {
        "16": "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.",
        "17": "For God did not send his Son into the world to condemn the world, but to save the world through him.",
        "18": "Whoever believes in him is not condemned, but whoever does not believe stands condemned already because they have not believed in the name of God's one and only Son."
      },
      "14": {
        "6": "Jesus answered, \"I am the way and the truth and the life. No one comes to the Father except through me.\""
      }
    },
    "Romans": {
      "3": {
        "23": "for all have sinned and fall short of the glory of God,",
        "24": "and all are justified freely by his grace through the redemption that came by Christ Jesus."
      },
      "5": {
        "8": "But God demonstrates his own love for us in this: While we were still sinners, Christ died for us.",
        "9": "Since we have now been justified by his blood, how much more shall we be saved from God's wrath through him!"
      },
      "8": {
        "28": "And we know that in all things God works for the good of those who love him, who have been called according to his purpose.",
        "38": "For I am convinced that neither death nor life, neither angels nor demons, neither the present nor the future, nor any powers,",
        "39": "neither height nor depth, nor anything else in all creation, will be able to separate us from the love of God that is in Christ Jesus our Lord."
      }
    },
    "Ephesians": {
      "2": {
        "8": "For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God—",
        "9": "not by works, so that no one can boast.",
        "10": "For we are God's handiwork, created in Christ Jesus to do good works, which God prepared in advance for us to do."
      }
    },
    "1 Peter": {
      "5": {
        "7": "Cast all your anxiety on him because he cares for you.",
        "8": "Be alert and of sober mind. Your enemy the devil prowls around like a roaring lion looking for someone to devour."
      }
    }
  };

  /* ================================================================
   * ENGLISH — English Standard Version (ESV) — sample verses
   * ================================================================ */
  const ESV = {
    "Genesis": {
      "1": {
        "1": "In the beginning, God created the heavens and the earth.",
        "2": "The earth was without form and void, and darkness was over the face of the deep. And the Spirit of God was hovering over the face of the waters.",
        "3": "And God said, \"Let there be light,\" and there was light.",
        "4": "And God saw that the light was good. And God separated the light from the darkness."
      }
    },
    "Psalms": {
      "23": {
        "1": "The LORD is my shepherd; I shall not want.",
        "2": "He makes me lie down in green pastures. He leads me beside still waters.",
        "3": "He restores my soul. He leads me in paths of righteousness for his name's sake.",
        "4": "Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me; your rod and your staff, they comfort me.",
        "5": "You prepare a table before me in the presence of my enemies; you anoint my head with oil; my cup overflows.",
        "6": "Surely goodness and mercy shall follow me all the days of my life, and I shall dwell in the house of the LORD forever."
      }
    },
    "Proverbs": {
      "3": {
        "5": "Trust in the LORD with all your heart, and do not lean on your own understanding.",
        "6": "In all your ways acknowledge him, and he will make straight your paths."
      }
    },
    "Isaiah": {
      "40": {
        "31": "but they who wait for the LORD shall renew their strength; they shall mount up with wings like eagles; they shall run and not be weary; they shall walk and not faint."
      }
    },
    "John": {
      "1": {
        "1": "In the beginning was the Word, and the Word was with God, and the Word was God.",
        "2": "He was in the beginning with God.",
        "3": "All things were made through him, and without him was not any thing made that was made.",
        "4": "In him was life, and the life was the light of men.",
        "5": "The light shines in the darkness, and the darkness has not overcome it.",
        "14": "And the Word became flesh and dwelt among us, and we have seen his glory, glory as of the only Son from the Father, full of grace and truth."
      },
      "3": {
        "16": "For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.",
        "17": "For God did not send his Son into the world to condemn the world, but in order that the world might be saved through him.",
        "18": "Whoever believes in him is not condemned, but whoever does not believe is condemned already, because he has not believed in the name of the only Son of God."
      },
      "14": {
        "6": "Jesus said to him, \"I am the way, and the truth, and the life. No one comes to the Father except through me.\""
      }
    },
    "Romans": {
      "3": {
        "23": "for all have sinned and fall short of the glory of God,",
        "24": "and are justified by his grace as a gift, through the redemption that is in Christ Jesus,"
      },
      "5": {
        "8": "but God shows his love for us in that while we were still sinners, Christ died for us.",
        "9": "Since, therefore, we have now been justified by his blood, much more shall we be saved by him from the wrath of God."
      },
      "8": {
        "28": "And we know that for those who love God all things work together for good, for those who are called according to his purpose.",
        "38": "For I am sure that neither death nor life, nor angels nor rulers, nor things present nor things to come, nor powers,",
        "39": "nor height nor depth, nor anything else in all creation, will be able to separate us from the love of God in Christ Jesus our Lord."
      }
    },
    "Ephesians": {
      "2": {
        "8": "For by grace you have been saved through faith. And this is not your own doing; it is the gift of God,",
        "9": "not a result of works, so that no one may boast.",
        "10": "For we are his workmanship, created in Christ Jesus for good works, which God prepared beforehand, that we should walk in them."
      }
    },
    "1 Peter": {
      "5": {
        "7": "casting all your anxieties on him, because he cares for you.",
        "8": "Be sober-minded; be watchful. Your adversary the devil prowls around like a roaring lion, seeking someone to devour."
      }
    }
  };

  /* ================================================================
   * TAMIL — Parisudha Vedhagamam (PV)  — sample verses
   * ================================================================ */
  const PV = {
    "Genesis": {
      "1": {
        "1": "ஆதியிலே தேவன் வானத்தையும் பூமியையும் சிருஷ்டித்தார்.",
        "2": "பூமியானது ரூபமற்றதும் வெறுமையுமாயிருந்தது; ஆழத்தின்மேல் இருள் இருந்தது; தேவ ஆவியானவர் ஜலத்தின்மேல் அசைவாடிக்கொண்டிருந்தார்.",
        "3": "தேவன் வெளிச்சம் உண்டாகக்கடவது என்றார்; வெளிச்சம் உண்டாயிற்று.",
        "4": "வெளிச்சம் நல்லது என்று தேவன் கண்டார்; வெளிச்சத்தையும் இருளையும் தேவன் பிரித்தார்."
      },
      "2": {
        "1": "இவ்விதமாக வானமும் பூமியும் அவைகளிலுள்ள சர்வ சேனையும் உண்டாகி முடிந்தது.",
        "2": "தேவன் ஏழாம் நாளிலே தாம் செய்த தமது கிரியையை முடித்தார்; தாம் செய்த தமது கிரியையெல்லாவற்றிலும் ஏழாம் நாளிலே இளைப்பாறினார்.",
        "3": "தேவன் ஏழாம் நாளை ஆசீர்வதித்து, அதை பரிசுத்தமாக்கினார்."
      }
    },
    "Exodus": {
      "3": {
        "13": "மோசே தேவனை நோக்கி: இதோ, நான் இஸ்ரவேல் புத்திரர் இடத்தில் போய்: உங்கள் பிதாக்களின் தேவன் என்னை உங்களிடத்திற்கு அனுப்பினார் என்று சொல்வேன்; அவர்கள் அவருடைய நாமம் என்னவென்று என்னிடத்தில் கேட்டால், அவர்களுக்கு என்ன சொல்வேன் என்றான்.",
        "14": "தேவன் மோசேயை நோக்கி: இருக்கிறவர் இருக்கிறேன் என்று சொன்னார்; இஸ்ரவேல் புத்திரர்களிடத்தில் நீ போய்: இருக்கிறேன் என்பவர் என்னை உங்களிடத்திற்கு அனுப்பினார் என்று சொல்லுவாயாக என்றார்."
      }
    },
    "Psalms": {
      "23": {
        "1": "கர்த்தர் என் மேய்ப்பராயிருக்கிறார்; எனக்கு குறைவில்லை.",
        "2": "அவர் என்னைப் பசும்புல் வெளிகளில் படுத்திறைக்கிறார்; அமர்ந்த தண்ணீர்களண்டை என்னை நடத்துகிறார்.",
        "3": "என் ஆத்துமாவை அவர் தேற்றுகிறார்; தம்முடைய நாமத்தினிமித்தம் நீதியின் பாதைகளில் என்னை நடத்துகிறார்.",
        "4": "மரண இருளின் பள்ளத்தாக்கில் நான் நடந்தாலும் தீங்குக்கு அஞ்சேன்; தேவரீர் என்னோடிருக்கிறீர்; உம்முடைய தண்டும் உம்முடைய கோலும் என்னை தேற்றுகின்றன.",
        "5": "என் சத்துருக்கள் பார்க்கும்போதே என்னெதிரே பந்தியை ஆயத்தம்பண்ணுகிறீர்; என் தலையை எண்ணெயால் அபிஷேகம் பண்ணுகிறீர்; என் பாத்திரம் நிறைகிறது.",
        "6": "என் ஜீவனுள்ள நாளெல்லாம் நன்மையும் கிருபையும் என்னைத் தொடரும்; நான் கர்த்தருடைய வீட்டில் என்றென்றும் வாசம்பண்ணுவேன்."
      },
      "46": {
        "1": "தேவன் நமக்கு அடைக்கலமும் பலமுமானவர்; நெருக்கத்திலே அவர் மிகவும் சீக்கிரமாய் துணைசெய்கிறவர்.",
        "2": "ஆகையால் பூமி மாறினாலும், மலைகள் சமுத்திரத்தின் மத்தியிலே விழுந்தாலும், நாம் பயப்படோம்."
      }
    },
    "Proverbs": {
      "3": {
        "5": "உன் முழு இருதயத்தோடும் கர்த்தரில் நம்பிக்கை வை; உன் சுயபுத்தியின்மேல் சார்ந்துகொள்ளாதே.",
        "6": "உன் எல்லா வழிகளிலும் அவரை நினைத்துக்கொள்; அவரே உன் பாதைகளை செவ்வைப்படுத்துவார்.",
        "7": "உன் பார்வையில் நீயே ஞானியாயிருக்காதே; கர்த்தருக்குப் பயந்து தீமையை விட்டு விலகு.",
        "8": "அது உன் தேகத்திற்கு ஆரோக்கியமும் உன் எலும்புகளுக்கு தண்ணீர்ப்பாய்ச்சலுமாயிருக்கும்."
      }
    },
    "Isaiah": {
      "40": {
        "31": "கர்த்தருக்குக் காத்திருக்கிறவர்களோ புதுப்பெலன் அடைவார்கள்; அவர்கள் கழுகுகளைப்போல் செட்டைகளை அடித்து எழும்புவார்கள்; அவர்கள் ஓடினாலும் இளைக்கார்கள்; நடந்தாலும் சோர்வடையார்கள்."
      }
    },
    "Matthew": {
      "5": {
        "3": "ஆவியில் எளியவர்கள் பாக்கியவான்கள்; பரலோக ராஜ்யம் அவர்களுடையது.",
        "4": "துக்கப்படுகிறவர்கள் பாக்கியவான்கள்; அவர்கள் ஆறுதல் அடைவார்கள்.",
        "5": "சாந்தகுணமுள்ளவர்கள் பாக்கியவான்கள்; அவர்கள் பூமியை சுதந்தரிப்பார்கள்.",
        "6": "நீதியின்மேல் பசிதாகமுள்ளவர்கள் பாக்கியவான்கள்; அவர்கள் திருப்தியடைவார்கள்.",
        "7": "இரக்கமுள்ளவர்கள் பாக்கியவான்கள்; அவர்களுக்கு இரக்கம் செய்யப்படும்.",
        "8": "இருதயத்தில் சுத்தமுள்ளவர்கள் பாக்கியவான்கள்; அவர்கள் தேவனைக் காண்பார்கள்.",
        "9": "சமாதானமுண்டாக்குகிறவர்கள் பாக்கியவான்கள்; அவர்கள் தேவனுடைய புத்திரர் என்னப்படுவார்கள்."
      }
    },
    "John": {
      "1": {
        "1": "ஆதியிலே வார்த்தை இருந்தது; அந்த வார்த்தை தேவனிடத்திலிருந்தது; அந்த வார்த்தை தேவனாயிருந்தது.",
        "2": "அவர் ஆதியிலே தேவனோடிருந்தார்.",
        "3": "சகலமும் அவர் மூலமாய் உண்டாயிற்று; உண்டானவைகளில் ஒன்றும் அவராலே உண்டாகாமல் உண்டாகவில்லை.",
        "4": "அவரில் ஜீவன் இருந்தது; அந்த ஜீவன் மனுஷருக்கு வெளிச்சமாயிருந்தது.",
        "5": "வெளிச்சம் இருளில் பிரகாசிக்கிறது; இருளானது அதை உள்ளடக்கவில்லை.",
        "14": "அந்த வார்த்தை மாம்சமாகி, கிருபையினாலும் சத்தியத்தினாலும் நிறைந்தவராய், நம்மிடையே வாசம்பண்ணினார்; அவருடைய மகிமையை நாங்கள் கண்டோம்; பிதாவினாலே அனுப்பப்பட்ட ஒரே பேறான குமாரனுக்கு ஏற்ற மகிமையை கண்டோம்."
      },
      "3": {
        "16": "தேவன், தம்முடைய ஒரே பேறான குமாரனை விசுவாசிக்கிறவன் எவனோ அவன் கெட்டுப்போகாமல் நித்தியஜீவனை அடையும்படிக்கு, அவரை தந்தருளி இவ்வளவாய் உலகத்தில் அன்புகூர்ந்தார்.",
        "17": "தேவன் தம்முடைய குமாரனை உலகத்தை ஆக்கினைக்குட்படுத்த உலகத்தில் அனுப்பாமல், அவராலே உலகம் இரட்சிக்கப்படுவதற்கு அனுப்பினார்.",
        "18": "அவரை விசுவாசிக்கிறவன் ஆக்கினைக்குட்படான்; விசுவாசியாதவனோ தேவனுடைய ஒரே பேறான குமாரனுடைய நாமத்தில் விசுவாசமுள்ளவனாயிராதபடியால் ஏற்கனவே ஆக்கினைக்குட்பட்டிருக்கிறான்."
      },
      "14": {
        "6": "இயேசு அவனை நோக்கி: நானே வழியும் சத்தியமும் ஜீவனுமாயிருக்கிறேன்; என்னாலேயன்றி ஒருவனும் பிதாவினிடத்தில் வரான் என்றார்."
      }
    },
    "Acts": {
      "2": {
        "38": "அப்பொழுது பேதுரு அவர்களை நோக்கி: மனந்திரும்புங்கள், உங்கள் பாவங்கள் மன்னிக்கப்படும்படி இயேசு கிறிஸ்துவின் நாமத்தினாலே உங்களில் ஒவ்வொருவனும் ஞானஸ்நானம் பெற்றுக்கொள்ளுங்கள்; அப்பொழுது பரிசுத்த ஆவியின் வரத்தைப் பெறுவீர்கள் என்றான்.",
        "39": "இந்த வாக்குத்தத்தம் உங்களுக்கும் உங்கள் பிள்ளைகளுக்கும் தூரத்திலிருக்கிற யாவருக்கும், அதாவது, நம்முடைய தேவனாகிய கர்த்தர் தம்மிடத்தில் அழைக்கும் எல்லாருக்கும் உரியது என்றான்."
      }
    },
    "Romans": {
      "3": {
        "23": "எல்லாரும் பாவஞ்செய்து, தேவனுடைய மகிமையற்றவர்களாகி இருக்கிறார்கள்;",
        "24": "கிறிஸ்து இயேசுவிலுள்ள மீட்பினாலே அவருடைய கிருபையினாலே இலவசமாக நீதிமான்களாக்கப்படுகிறார்கள்."
      },
      "5": {
        "8": "நாம் இன்னும் பாவிகளாயிருக்கும்போதே கிறிஸ்து நமக்காக மரித்தார்; இதினால் தேவன் நம்மேல் வைத்த தம்முடைய அன்பை விளங்கப்பண்ணுகிறார்.",
        "9": "ஆகையால் நாம் இப்பொழுது அவருடைய இரத்தத்தினாலே நீதிமான்களாக்கப்பட்டிருக்கிறபடியினால், அவராலே தேவனுடைய கோபாக்கினையினின்று இரட்சிக்கப்படுவது அதிக நிச்சயம்."
      },
      "8": {
        "28": "தேவனிடத்தில் அன்புகூருகிறவர்களுக்கு, அதாவது, அவருடைய தீர்மானத்தின்படி அழைக்கப்பட்டவர்களுக்கு, எல்லாவற்றிலும் நன்மை உண்டாகும் என்று அறிந்திருக்கிறோம்.",
        "38": "மரணமானாலும் ஜீவனானாலும் தூதர்களானாலும் அதிகாரங்களானாலும் வல்லமைகளானாலும் நிகழ்காரியங்களானாலும் வரப்போகிற காரியங்களானாலும்,",
        "39": "உயர்வானாலும் தாழ்வானாலும் வேறே எந்த சிருஷ்டியானாலும், நம்முடைய கர்த்தராகிய கிறிஸ்து இயேசுவினிடத்திலுள்ள தேவனுடைய அன்பினின்று நம்மை பிரிக்கமாட்டாது என்று நிச்சயித்திருக்கிறேன்."
      }
    },
    "Ephesians": {
      "2": {
        "8": "கிருபையினாலே விசுவாசத்தைக்கொண்டு இரட்சிக்கப்பட்டீர்கள்; இது உங்களால் உண்டானதல்ல, தேவனுடைய ஈவே;",
        "9": "ஒருவரும் பெருமைப்படாதபடிக்கு இது கிரியைகளினால் உண்டானதல்ல.",
        "10": "நாம் அவருடைய கிரியையாக்கம்; அவர் முன்னதாக நமக்காக ஆயத்தம்பண்ணின நற்கிரியைகளில் நாம் நடக்கும்படிக்கு கிறிஸ்து இயேசுவுக்குள் சிருஷ்டிக்கப்பட்டோம்."
      }
    },
    "1 Peter": {
      "5": {
        "7": "அவர் உங்களை கவலைப்படுத்துகிறபடியால் உங்கள் கவலைகளையெல்லாம் அவர்மேல் வையுங்கள்.",
        "8": "நீங்கள் சுயநினைவாயும் விழிப்பாயும் இருங்கள்; உங்கள் எதிராளியாகிய பிசாசானவன் யாரை விழுங்கலாம் என்று தேடிக்கொண்டு கெர்ச்சிக்கிற சிங்கம்போல் சுற்றித்திரிகிறான்."
      }
    }
  };

  /* ================================================================
   * SERMONS — linked to passages
   * ================================================================ */
  const SAMPLE_SERMONS = [
    { title: "The Love of God", speaker: "Ps. Daniel Raj", topic: "God's Love", passage: "John 3:16", date: "2026-06-15", type: "Video", media: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    { title: "Salvation Through Christ", speaker: "Ps. Daniel Raj", topic: "Salvation", passage: "Romans 3:23", date: "2026-06-08", type: "Video", media: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    { title: "Grace That Saves", speaker: "Bro. Samuel John", topic: "Grace", passage: "Ephesians 2:8", date: "2026-06-01", type: "Video", media: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    { title: "Trust in the Lord", speaker: "Sis. Priya Daniel", topic: "Faith", passage: "Proverbs 3:5", date: "2026-05-25", type: "Audio", media: "#" },
    { title: "The Shepherd's Care", speaker: "Ps. Daniel Raj", topic: "Comfort", passage: "Psalms 23:1", date: "2026-05-18", type: "Video", media: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    { title: "Born Again Experience", speaker: "Bro. Abraham Paul", topic: "Rebirth", passage: "John 3:18", date: "2026-05-11", type: "Video", media: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    { title: "God's Love in Romans", speaker: "Ps. Daniel Raj", topic: "Love", passage: "Romans 5:8", date: "2026-05-04", type: "Video", media: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    { title: "Beginning with God", speaker: "Sis. Mary Anna", topic: "Creation", passage: "Genesis 1:1", date: "2026-04-27", type: "Audio", media: "#" },
    { title: "I AM — God's Identity", speaker: "Ps. Daniel Raj", topic: "God's Name", passage: "Exodus 3:14", date: "2026-04-20", type: "Video", media: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    { title: "God's Refuge and Strength", speaker: "Bro. Samuel John", topic: "Strength", passage: "Psalms 46:1", date: "2026-04-13", type: "Video", media: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }
  ];

  /* ================================================================
   * VERSE INDEX — used for search
   * ================================================================ */
  const SAMPLE_VERSES = [
    { reference: "John 3:16", text: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life." },
    { reference: "Romans 3:23", text: "For all have sinned, and come short of the glory of God;" },
    { reference: "Ephesians 2:8", text: "For by grace are ye saved through faith; and that not of yourselves: it is the gift of God:" },
    { reference: "Psalms 23:1", text: "The LORD is my shepherd; I shall not want." },
    { reference: "Proverbs 3:5", text: "Trust in the LORD with all thine heart; and lean not unto thine own understanding." },
    { reference: "Romans 5:8", text: "But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us." },
    { reference: "1 Peter 5:7", text: "Casting all your care upon him; for he careth for you." },
    { reference: "Genesis 1:1", text: "In the beginning God created the heaven and the earth." },
    { reference: "Romans 8:28", text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose." },
    { reference: "John 14:6", text: "Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me." },
    { reference: "Isaiah 40:31", text: "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint." }
  ];

  /* ================================================================
   * EXPORT to window for use by bible-portal.js
   * ================================================================ */
  window.SAMPLE_BIBLE_DATA = {
    translations: { kjv: KJV, nkjv: NKJV, niv: NIV, esv: ESV, pv: PV },
    // Legacy aliases (keeps older references working)
    en: KJV,
    ta: PV,
    books: BOOKS_SAMPLE,
    sermons: SAMPLE_SERMONS,
    verses: SAMPLE_VERSES
  };

  console.log("[BiblePortal] Multi-translation sample data ready.");

})();

