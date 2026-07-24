(() => {
  const form = document.getElementById("calc-form");
  const birthYearInput = document.getElementById("birth-year");
  const birthMonthInput = document.getElementById("birth-month");
  const birthDayInput = document.getElementById("birth-day");
  const lastNameInput = document.getElementById("last-name");
  const firstNameInput = document.getElementById("first-name");
  // タップ表・お試しボタンは1つしかないため、直前にフォーカスしていた方の
  // 欄（苗字／名前）に対して操作する。既定は苗字欄。
  let activeNameInput = lastNameInput;
  const nameWarningEl = document.getElementById("name-warning");
  const romajiToggleBtn = document.getElementById("romaji-table-toggle");
  const romajiTablePanel = document.getElementById("romaji-table");
  const romajiTableBody = document.getElementById("romaji-table-body");
  const romajiSpaceBtn = document.getElementById("romaji-space-btn");
  const romajiUndoBtn = document.getElementById("romaji-undo-btn");
  const romajiCloseBtn = document.getElementById("romaji-close-btn");
  const romajiDemoBtn = document.getElementById("romaji-demo-btn");
  const errorMessage = document.getElementById("error-message");
  const resultsEl = document.getElementById("results");
  const masterSummaryEl = document.getElementById("master-summary");
  const groupBasic3El = document.getElementById("group-basic3");
  const groupPersonalYearEl = document.getElementById("group-personal-year");
  const personalYearHeadingEl = document.getElementById("personal-year-heading");
  const groupChallengeDetailEl = document.getElementById("group-challenge-detail");
  const groupPinnacleDetailEl = document.getElementById("group-pinnacle-detail");
  const groupNameEl = document.getElementById("group-name");
  const groupCombinedWrapEl = document.getElementById("group-combined-wrap");
  const groupCombinedEl = document.getElementById("group-combined");
  const karmicSummaryEl = document.getElementById("karmic-summary");

  const MASTER_NUMBERS = [11, 22, 33];
  const KARMIC_DEBT_NUMBERS = [13, 14, 16, 19];
  const VOWELS = new Set(["a", "e", "i", "o", "u"]);

  const NUMBER_MEANINGS = {
    1: "リーダーシップや独立心、新しいことを始める力の象徴とされています。",
    2: "協調性やバランス感覚、人との調和を大切にする傾向があると言われています。",
    3: "表現力や創造性、明るさやコミュニケーション力の象徴とされています。",
    4: "堅実さや責任感、コツコツ積み上げていく力があると言われています。",
    5: "自由や変化を好み、好奇心旺盛な傾向があるとされています。",
    6: "思いやりや調和、周囲を支える愛情深さの象徴とされています。",
    7: "探究心や内省、精神性を大切にする傾向があると言われています。",
    8: "実行力や物質的な成功、リーダーとしての手腕の象徴とされています。",
    9: "博愛精神や包容力、人のために尽くす傾向があるとされています。",
    11: "直感力やひらめき、精神的な気づきをもたらすマスターナンバーとされています。",
    22: "大きな理想を現実の形にする力を持つマスターナンバーとされています。",
    33: "無償の愛や奉仕の精神を象徴するマスターナンバーとされています。",
  };

  // Challenge numbers land in the plain 0-8 range almost always, so a short,
  // distinct set of blurbs (rather than reusing the 1-9 meanings above) fits
  // the "which everyday challenge" framing better.
  const CHALLENGE_MEANINGS = {
    0: "特定の課題に偏らず、状況に応じて柔軟に向き合う時期とされています。",
    1: "自立心を育て、自分の意思で行動する力を養う時期とされています。",
    2: "人との関わり方や、協調・バランスの取り方が課題になるとされています。",
    3: "自己表現や、気持ちを言葉にすることが課題になるとされています。",
    4: "地道な努力や、物事を着実に積み上げることが課題になるとされています。",
    5: "変化への適応や、自由と責任のバランスが課題になるとされています。",
    6: "周囲への責任や、家庭・人間関係のバランスが課題になるとされています。",
    7: "内面と向き合い、自分自身を深く理解することが課題になるとされています。",
    8: "力や資源の使い方、物事の管理・采配が課題になるとされています。",
    9: "私利私欲にとらわれず、広い視野で人や物事と関わることが課題になるとされています。",
    11: "直感や気づきを通じて、自分自身と深く向き合うことが課題になるとされています。",
  };

  // Karmic debt numbers (13, 14, 16, 19): traditionally noted when one of
  // these appears as the *raw*, pre-reduction sum behind the Life Path or
  // Destiny number, before it's collapsed down to a single digit.
  const KARMIC_DEBT_MEANINGS = {
    13: "怠けず地道に積み上げることで、努力の大切さを学ぶ経験があるとされています。",
    14: "自由を求めすぎた反動から、節度やバランスを学ぶ経験があるとされています。",
    16: "自我や慢心を手放し、謙虚さを学ぶような大きな変化を経験するとされています。",
    19: "人に頼りすぎず、自立する強さを経験を通して学ぶとされています。",
  };

  const LIFE_LESSON_MEANINGS = {
    1: "リーダーシップや自主性を、意識して育てていく課題があるとされています。",
    2: "人との協調やバランスの取り方を、意識して育てていく課題があるとされています。",
    3: "自己表現やコミュニケーションを、意識して育てていく課題があるとされています。",
    4: "地道な努力やコツコツ取り組む力を、意識して育てていく課題があるとされています。",
    5: "変化への柔軟さや自由な発想を、意識して育てていく課題があるとされています。",
    6: "思いやりや責任感を、意識して育てていく課題があるとされています。",
    7: "内省や探究心を、意識して育てていく課題があるとされています。",
    8: "実行力や物事を采配する力を、意識して育てていく課題があるとされています。",
    9: "博愛の心や広い視野を、意識して育てていく課題があるとされています。",
  };

  // Tapped from any result card to explain what that category of number is,
  // as opposed to the result-desc text which explains what the specific
  // digit (1-9 etc.) means. Keyed per card type, not per digit.
  const GLOSSARY = {
    lifePath: {
      title: "ライフパスナンバーとは？",
      body: "生まれ持った性質や、人生全体を通じて向き合うことになるとされる中心的なテーマを表す数字です。数秘術の中でも特に重視されることが多く、他の数字を読み解くときの土台のような役割を持つとされています。",
    },
    birthday: {
      title: "バースデーナンバーとは？",
      body: "生まれ持った資質や、得意なこと・才能をどう活かしていくかのヒントを表すとされる数字です。ライフパスナンバーを補う、得意技のような役割を持つとされています。",
    },
    challenge: {
      title: "チャレンジナンバーとは？",
      body: "今世で意識して向き合うとよいとされる、日々の暮らしの中で出会いやすい身近な課題を表す数字です。下の「チャレンジナンバー詳細」とは別の数字として扱われ、値が一致しないことがあります。",
    },
    personalYear: {
      title: "パーソナルイヤーナンバーとは？",
      body: "その年がどんなテーマの年になりそうかを表すとされる数字です。1年ごとに切り替わり、その年を過ごすうえでのヒントになるとされています。",
    },
    personalMonth: {
      title: "パーソナルマンスナンバーとは？",
      body: "その月がどんなテーマの月になりそうかを表すとされる数字です。パーソナルイヤーナンバーを、さらに1か月単位に絞り込んだものとされています。",
    },
    personalDay: {
      title: "パーソナルデイナンバーとは？",
      body: "今日がどんな日になりそうかを表すとされる数字です。毎日切り替わり、その日を過ごすうえでのちょっとしたヒントになるとされています。",
    },
    challengeDetail: {
      title: "ステージ別の課題とは？",
      body: "人生を4つの時期（ステージ）に分け、それぞれの時期に乗り越えていくとよいとされる課題を表す数字です。「基本の3数字」のチャレンジナンバーとは別の数字として扱われます。",
    },
    pinnacle: {
      title: "ステージ別のチャンスとは？",
      body: "人生を4つの時期（ステージ）に分け、それぞれの時期に活かせるとされる機会・強みを表す数字です（課題とチャンスが対になる関係です）。",
    },
    destiny: {
      title: "デスティニーナンバーとは？",
      body: "今世での使命や、社会との関わり方を表すとされる数字です。持って生まれた才能を、どのように世の中で発揮していくかを示すとされています。",
    },
    soul: {
      title: "ソウルナンバーとは？",
      body: "心の奥にある、本当の欲求や本音を表すとされる数字です。誰にも見せていない、内側の願いを映すとされています。",
    },
    personality: {
      title: "パーソナリティナンバーとは？",
      body: "他人から見た印象や、外に見せている顔を表すとされる数字です。第一印象や、周囲に与える雰囲気に関わるとされています。",
    },
    lifeLesson: {
      title: "ライフレッスンナンバーとは？",
      body: "今世で意識して育てていくとよいとされる、名前だけでは補いきれない資質を表す数字です。該当する数字が複数のことも、1つも無いこともあります。",
    },
    intensity: {
      title: "インテンシティナンバーとは？",
      body: "名前のエネルギーが集中しているとされる、際立った資質を表す数字です。同じ回数で並ぶ数字が複数ある場合は、すべて表示されます。",
    },
    maturity: {
      title: "成熟数（マチュリティナンバー）とは？",
      body: "人生後半にかけて表れてくるとされる数字です。若い頃よりも、年齢を重ねてから意識されやすい資質を表すとされています。",
    },
  };

  const LETTER_VALUES = {
    a: 1, j: 1, s: 1,
    b: 2, k: 2, t: 2,
    c: 3, l: 3, u: 3,
    d: 4, m: 4, v: 4,
    e: 5, n: 5, w: 5,
    f: 6, o: 6, x: 6,
    g: 7, p: 7, y: 7,
    h: 8, q: 8, z: 8,
    i: 9, r: 9,
  };

  // Modern-style (Hepburn) romanization, not the older 訓令式 (e.g. し=shi,
  // not si; ちゃ=cha, not tya) — this is the whole point of the table, since
  // that's the exact confusion it exists to prevent.
  const KANA_SECTIONS = [
    {
      title: "清音",
      items: [
        ["あ", "a"], ["い", "i"], ["う", "u"], ["え", "e"], ["お", "o"],
        ["か", "ka"], ["き", "ki"], ["く", "ku"], ["け", "ke"], ["こ", "ko"],
        ["さ", "sa"], ["し", "shi"], ["す", "su"], ["せ", "se"], ["そ", "so"],
        ["た", "ta"], ["ち", "chi"], ["つ", "tsu"], ["て", "te"], ["と", "to"],
        ["な", "na"], ["に", "ni"], ["ぬ", "nu"], ["ね", "ne"], ["の", "no"],
        ["は", "ha"], ["ひ", "hi"], ["ふ", "fu"], ["へ", "he"], ["ほ", "ho"],
        ["ま", "ma"], ["み", "mi"], ["む", "mu"], ["め", "me"], ["も", "mo"],
        ["や", "ya"], ["ゆ", "yu"], ["よ", "yo"],
        ["ら", "ra"], ["り", "ri"], ["る", "ru"], ["れ", "re"], ["ろ", "ro"],
        ["わ", "wa"], ["を", "o"], ["ん", "n"],
      ],
    },
    {
      title: "濁音・半濁音",
      items: [
        ["が", "ga"], ["ぎ", "gi"], ["ぐ", "gu"], ["げ", "ge"], ["ご", "go"],
        ["ざ", "za"], ["じ", "ji"], ["ず", "zu"], ["ぜ", "ze"], ["ぞ", "zo"],
        ["だ", "da"], ["ぢ", "ji"], ["づ", "zu"], ["で", "de"], ["ど", "do"],
        ["ば", "ba"], ["び", "bi"], ["ぶ", "bu"], ["べ", "be"], ["ぼ", "bo"],
        ["ぱ", "pa"], ["ぴ", "pi"], ["ぷ", "pu"], ["ぺ", "pe"], ["ぽ", "po"],
      ],
    },
    {
      title: "拗音",
      items: [
        ["きゃ", "kya"], ["きゅ", "kyu"], ["きょ", "kyo"],
        ["しゃ", "sha"], ["しゅ", "shu"], ["しょ", "sho"],
        ["ちゃ", "cha"], ["ちゅ", "chu"], ["ちょ", "cho"],
        ["にゃ", "nya"], ["にゅ", "nyu"], ["にょ", "nyo"],
        ["ひゃ", "hya"], ["ひゅ", "hyu"], ["ひょ", "hyo"],
        ["みゃ", "mya"], ["みゅ", "myu"], ["みょ", "myo"],
        ["りゃ", "rya"], ["りゅ", "ryu"], ["りょ", "ryo"],
        ["ぎゃ", "gya"], ["ぎゅ", "gyu"], ["ぎょ", "gyo"],
        ["じゃ", "ja"], ["じゅ", "ju"], ["じょ", "jo"],
        ["びゃ", "bya"], ["びゅ", "byu"], ["びょ", "byo"],
        ["ぴゃ", "pya"], ["ぴゅ", "pyu"], ["ぴょ", "pyo"],
      ],
    },
    {
      // ヴ（外来語のv音）：日本語にv音はなく、ヘボン式の一般的な慣例に
      // 合わせてbで代用する（例：ヴィヴィアン→bibian、ヴォードレール→bodoreru）。
      title: "ヴ（外来語）",
      items: [
        ["ヴァ", "ba"], ["ヴィ", "bi"], ["ヴ", "bu"], ["ヴェ", "be"], ["ヴォ", "bo"],
      ],
    },
  ];

  function sumDigits(n) {
    return String(Math.abs(n))
      .split("")
      .reduce((sum, d) => sum + Number(d), 0);
  }

  function digitsOf(n) {
    return String(Math.abs(n))
      .split("")
      .map(Number);
  }

  function reduceToSingleOrMaster(n) {
    let value = Math.abs(n);
    while (value > 9 && !MASTER_NUMBERS.includes(value)) {
      value = sumDigits(value);
    }
    return value;
  }

  function isMaster(value) {
    return MASTER_NUMBERS.includes(value);
  }

  // Used only for the age-range formula below: master numbers (11/22/33)
  // must be fully collapsed to a single digit here, or "36 - 33 = 3" would
  // make the first life period an absurd 0-3 years. Every other calculation
  // in this app keeps master numbers intact; this one specifically doesn't.
  function reduceToSingleDigitOnly(n) {
    let value = Math.abs(n);
    while (value > 9) {
      value = sumDigits(value);
    }
    return value;
  }

  function nameLetters(name) {
    return name.toLowerCase().replace(/[^a-z]/g, "").split("");
  }

  function sumLetterValues(letters) {
    return letters.reduce((sum, letter) => sum + (LETTER_VALUES[letter] || 0), 0);
  }

  // The Life Path Number itself is taken from the sum of every single digit
  // in the birthdate (year + month + day) reduced as one number, not from
  // adding together the month/day/year after each has already been reduced
  // separately. The two methods usually agree, but not always — reducing
  // each part first can "hide" a master number that only appears when every
  // digit is summed directly (e.g. 1978-12-14 sums straight to 33, a master
  // number, but reduces to 6 if month/day/year are collapsed first).
  // rMonth/rDay/rYear are still needed on their own for the Challenge and
  // Birthday numbers below, which do use the separately-reduced parts.
  function calcLifePathNumber(year, month, day) {
    const rMonth = reduceToSingleOrMaster(month);
    const rDay = reduceToSingleOrMaster(day);
    const rYear = reduceToSingleOrMaster(sumDigits(year));
    const raw = sumDigits(year) + sumDigits(month) + sumDigits(day);
    return { value: reduceToSingleOrMaster(raw), raw, rMonth, rDay, rYear };
  }

  function calcBirthdayNumber(day) {
    return reduceToSingleOrMaster(day);
  }

  // Feeds only the "4 life periods" detail breakdown below (第1〜第4チャレンジ),
  // not the basic-3 "チャレンジナンバー" card — that one uses the 未来数-style
  // calcChallengeNumber (singular) instead. The two intentionally use
  // different formulas and can produce different values for the same date.
  function calcChallengeNumbers(rMonth, rDay, rYear) {
    const c1 = reduceToSingleOrMaster(Math.abs(rMonth - rDay));
    const c2 = reduceToSingleOrMaster(Math.abs(rDay - rYear));
    const c3 = reduceToSingleOrMaster(Math.abs(c1 - c2));
    const c4 = reduceToSingleOrMaster(Math.abs(rMonth - rYear));
    return [c1, c2, c3, c4];
  }

  // The basic-3 "チャレンジナンバー": breaks the month and day into individual
  // digits and adds them all together (year excluded), then reduces. This is
  // the calculation commonly called 未来数 (future number) in Japanese
  // numerology, and is often used interchangeably with the name
  // "チャレンジナンバー" there — distinct from the Western subtraction-based
  // Challenge Number used in the 4-period detail breakdown above.
  function calcChallengeNumber(month, day) {
    const raw = digitsOf(month).concat(digitsOf(day)).reduce((sum, d) => sum + d, 0);
    return reduceToSingleOrMaster(raw);
  }

  // Pinnacle numbers pair with the Challenge numbers above — same 4 life
  // periods, same rMonth/rDay/rYear inputs, but summed instead of
  // differenced: they represent the opportunity/strength side rather than
  // the obstacle side of each period.
  function calcPinnacleNumbers(rMonth, rDay, rYear) {
    const p1 = reduceToSingleOrMaster(rMonth + rDay);
    const p2 = reduceToSingleOrMaster(rDay + rYear);
    const p3 = reduceToSingleOrMaster(p1 + p2);
    const p4 = reduceToSingleOrMaster(rMonth + rYear);
    return [p1, p2, p3, p4];
  }

  // The four Pinnacle (and paired Challenge) periods each cover a specific
  // age range, driven by the Life Path Number: the first period runs from
  // birth to (36 - Life Path Number), the second and third each last 9
  // years after that, and the fourth covers the rest of life.
  function calcPinnacleAgeRanges(lifePathValue) {
    const endFirst = 36 - reduceToSingleDigitOnly(lifePathValue);
    return [
      { from: 0, to: endFirst },
      { from: endFirst + 1, to: endFirst + 9 },
      { from: endFirst + 10, to: endFirst + 18 },
      { from: endFirst + 19, to: null },
    ];
  }

  function formatAgeRange(range) {
    return range.to === null ? `${range.from}歳〜` : `${range.from}〜${range.to}歳`;
  }

  // What this year (or any target year) represents for this person: the
  // birth month/day combined with a given calendar year, reduced. Unlike
  // every other number here, this one changes every year.
  function calcPersonalYearNumber(rMonth, rDay, targetYear) {
    const rTargetYear = reduceToSingleOrMaster(sumDigits(targetYear));
    return reduceToSingleOrMaster(rMonth + rDay + rTargetYear);
  }

  // Personal Month/Day build on top of Personal Year by adding the current
  // calendar month/day as-is (not pre-reduced) and reducing again — each one
  // narrows the "theme" from the year down to the month, then the day.
  function calcPersonalMonthNumber(personalYear, targetMonth) {
    return reduceToSingleOrMaster(personalYear + targetMonth);
  }

  function calcPersonalDayNumber(personalMonth, targetDay) {
    return reduceToSingleOrMaster(personalMonth + targetDay);
  }

  function calcDestinyNumber(letters) {
    if (letters.length === 0) return null;
    const raw = sumLetterValues(letters);
    return { value: reduceToSingleOrMaster(raw), raw };
  }

  function calcSoulNumber(letters) {
    const vowels = letters.filter((l) => VOWELS.has(l));
    if (vowels.length === 0) return null;
    return reduceToSingleOrMaster(sumLetterValues(vowels));
  }

  function calcPersonalityNumber(letters) {
    const consonants = letters.filter((l) => !VOWELS.has(l));
    if (consonants.length === 0) return null;
    return reduceToSingleOrMaster(sumLetterValues(consonants));
  }

  function calcMaturityNumber(lifePath, destiny) {
    if (destiny === null) return null;
    return reduceToSingleOrMaster(lifePath + destiny);
  }

  // The digits (1-9) that never appear among the name's letter values —
  // areas the name doesn't naturally cover, which this lifetime is said to
  // ask you to develop deliberately. Can be an empty list (every digit is
  // covered) or several digits at once.
  function calcLifeLessonNumbers(letters) {
    if (letters.length === 0) return null;
    const present = new Set(letters.map((l) => LETTER_VALUES[l]).filter(Boolean));
    const missing = [];
    for (let n = 1; n <= 9; n++) {
      if (!present.has(n)) missing.push(n);
    }
    return missing;
  }

  // The digit(s) that occur most often among the name's letter values —
  // where the name's energy is most concentrated. Usually a single digit,
  // but ties are possible and are all returned.
  function calcIntensityNumbers(letters) {
    if (letters.length === 0) return null;
    const counts = {};
    letters.forEach((l) => {
      const v = LETTER_VALUES[l];
      if (!v) return;
      counts[v] = (counts[v] || 0) + 1;
    });
    const values = Object.keys(counts).map(Number);
    if (values.length === 0) return [];
    const maxCount = Math.max(...values.map((v) => counts[v]));
    return values.filter((v) => counts[v] === maxCount).sort((a, b) => a - b);
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove("hidden");
    resultsEl.classList.add("hidden");
  }

  function attachGlossary(card, glossaryKey) {
    const entry = GLOSSARY[glossaryKey];
    if (!entry) return;
    card.addEventListener("click", () => openInfoModal(entry));
  }

  function createResultCard(label, value, meaningMap, wide, main, glossaryKey) {
    const card = document.createElement("div");
    card.className = "result-card" + (wide ? " wide" : "") + (main ? " main" : "");
    if (isMaster(value)) card.classList.add("master");

    const labelEl = document.createElement("div");
    labelEl.className = "result-label";
    labelEl.textContent = label;

    const numberEl = document.createElement("div");
    numberEl.className = "result-number";
    numberEl.textContent = String(value);

    const descEl = document.createElement("div");
    descEl.className = "result-desc";
    const meaning = meaningMap[value] || "";
    const masterNote = isMaster(value) ? "（マスターナンバーです）" : "";
    descEl.textContent = `${meaning}${masterNote}`;

    card.appendChild(labelEl);
    card.appendChild(numberEl);
    card.appendChild(descEl);
    attachGlossary(card, glossaryKey);
    return card;
  }

  // For numbers that can come back as zero, one, or several digits at once
  // (Life Lesson Number, Intensity Number), rather than always exactly one.
  function createMultiNumberCard(label, values, meaningMap, emptyText, wide, glossaryKey) {
    const card = document.createElement("div");
    card.className = "result-card" + (wide ? " wide" : "");
    if (values.some(isMaster)) card.classList.add("master");

    const labelEl = document.createElement("div");
    labelEl.className = "result-label";
    labelEl.textContent = label;

    const numberEl = document.createElement("div");
    numberEl.className = "result-number";
    numberEl.textContent = values.length > 0 ? values.join("・") : "―";

    const descEl = document.createElement("div");
    descEl.className = "result-desc";
    descEl.textContent = values.length > 0
      ? values.map((v) => meaningMap[v] || "").filter(Boolean).join(" ")
      : emptyText;

    card.appendChild(labelEl);
    card.appendChild(numberEl);
    card.appendChild(descEl);
    attachGlossary(card, glossaryKey);
    return card;
  }

  // Pressing Enter in a form field submits the form natively, which meant
  // the calculation could run before the owner had finished filling in both
  // fields (e.g. hitting Enter right after the date, with the name field
  // still empty). Calculation should only happen via the button itself.
  form.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName === "INPUT") {
      e.preventDefault();
    }
  });

  // Birthdate is split into 3 numeric-only boxes (year/month/day) so it can
  // be typed as one continuous run of digits, like "19781214": each box
  // auto-advances to the next once it's full, and Backspace on an empty box
  // jumps back to the previous one.
  function digitsOnly(value) {
    return value.replace(/[^0-9]/g, "");
  }

  function setupDateSegment(input, maxLength, nextInput) {
    input.addEventListener("input", () => {
      input.value = digitsOnly(input.value).slice(0, maxLength);
      if (input.value.length === maxLength && nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    });
  }

  function setupBackspaceToPrevious(input, prevInput) {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && input.value === "" && prevInput) {
        prevInput.focus();
      }
    });
  }

  setupDateSegment(birthYearInput, 4, birthMonthInput);
  setupDateSegment(birthMonthInput, 2, birthDayInput);
  setupDateSegment(birthDayInput, 2, null);
  setupBackspaceToPrevious(birthMonthInput, birthYearInput);
  setupBackspaceToPrevious(birthDayInput, birthMonthInput);

  // Pasting a full date (e.g. "19781214") into the year box distributes the
  // digits across all 3 boxes instead of overflowing into just the year box.
  birthYearInput.addEventListener("paste", (e) => {
    const pasted = digitsOnly((e.clipboardData || window.clipboardData).getData("text"));
    if (pasted.length < 5) return;
    e.preventDefault();
    birthYearInput.value = pasted.slice(0, 4);
    birthMonthInput.value = pasted.slice(4, 6);
    birthDayInput.value = pasted.slice(6, 8);
    (birthDayInput.value.length === 2 ? birthDayInput : birthMonthInput).focus();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    errorMessage.classList.add("hidden");

    if (birthYearInput.value.length !== 4 || !birthMonthInput.value || !birthDayInput.value) {
      showError("生年月日を入力してください。");
      return;
    }

    const year = Number(birthYearInput.value);
    const month = Number(birthMonthInput.value);
    const day = Number(birthDayInput.value);
    const parsedDate = new Date(year, month - 1, day);
    const isValidDate = parsedDate.getFullYear() === year
      && parsedDate.getMonth() === month - 1
      && parsedDate.getDate() === day;
    if (!year || !month || !day || !isValidDate) {
      showError("生年月日を正しく入力してください。");
      return;
    }

    groupBasic3El.innerHTML = "";
    groupPersonalYearEl.innerHTML = "";
    groupChallengeDetailEl.innerHTML = "";
    groupPinnacleDetailEl.innerHTML = "";
    groupNameEl.innerHTML = "";
    groupCombinedEl.innerHTML = "";

    const allValues = [];
    const karmicHits = [];

    function checkKarmic(raw) {
      if (KARMIC_DEBT_NUMBERS.includes(raw)) karmicHits.push(raw);
    }

    // The "basic 3" birthdate numbers: Life Path (full birthdate), Challenge
    // (month + day only), and Birthday (day only). The 4-period Challenge
    // breakdown below is a related but separate set of numbers — it uses a
    // different (subtraction-based) formula and its first value need not
    // match this Challenge Number.
    // Displayed left to right as Birthday / Life Path (main, emphasized) /
    // Challenge.
    const birthday = calcBirthdayNumber(day);
    allValues.push(birthday);
    groupBasic3El.appendChild(createResultCard("バースデーナンバー", birthday, NUMBER_MEANINGS, false, false, "birthday"));

    const lifePath = calcLifePathNumber(year, month, day);
    allValues.push(lifePath.value);
    checkKarmic(lifePath.raw);
    groupBasic3El.appendChild(createResultCard("ライフパスナンバー", lifePath.value, NUMBER_MEANINGS, false, true, "lifePath"));

    const challengeNumber = calcChallengeNumber(month, day);
    allValues.push(challengeNumber);
    groupBasic3El.appendChild(createResultCard("チャレンジナンバー", challengeNumber, CHALLENGE_MEANINGS, false, false, "challenge"));

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    const personalYear = calcPersonalYearNumber(lifePath.rMonth, lifePath.rDay, currentYear);
    allValues.push(personalYear);
    personalYearHeadingEl.textContent = `今年・今月・今日の数字（${currentYear}年${currentMonth}月${currentDay}日時点）`;
    groupPersonalYearEl.appendChild(createResultCard(`${currentYear}年のパーソナルイヤーナンバー`, personalYear, NUMBER_MEANINGS, true, false, "personalYear"));

    const personalMonth = calcPersonalMonthNumber(personalYear, currentMonth);
    allValues.push(personalMonth);
    groupPersonalYearEl.appendChild(createResultCard(`${currentMonth}月のパーソナルマンスナンバー`, personalMonth, NUMBER_MEANINGS, false, false, "personalMonth"));

    const personalDay = calcPersonalDayNumber(personalMonth, currentDay);
    allValues.push(personalDay);
    groupPersonalYearEl.appendChild(createResultCard(`${currentDay}日のパーソナルデイナンバー`, personalDay, NUMBER_MEANINGS, false, false, "personalDay"));

    const ageRanges = calcPinnacleAgeRanges(lifePath.value);
    const periodTags = ["人生前半", "人生中盤", "メイン", "人生後半"];

    const challenges = calcChallengeNumbers(lifePath.rMonth, lifePath.rDay, lifePath.rYear);
    challenges.forEach((c, i) => {
      allValues.push(c);
      const label = `第${i + 1}期の課題（${periodTags[i]}・${formatAgeRange(ageRanges[i])}）`;
      groupChallengeDetailEl.appendChild(createResultCard(label, c, CHALLENGE_MEANINGS, false, false, "challengeDetail"));
    });

    const pinnacles = calcPinnacleNumbers(lifePath.rMonth, lifePath.rDay, lifePath.rYear);
    pinnacles.forEach((p, i) => {
      allValues.push(p);
      const label = `第${i + 1}期のチャンス（${periodTags[i]}・${formatAgeRange(ageRanges[i])}）`;
      groupPinnacleDetailEl.appendChild(createResultCard(label, p, NUMBER_MEANINGS, false, false, "pinnacle"));
    });

    const fullName = `${lastNameInput.value} ${firstNameInput.value}`;
    const letters = nameLetters(fullName);
    const destinyResult = calcDestinyNumber(letters);
    const destiny = destinyResult ? destinyResult.value : null;
    if (destinyResult === null) {
      groupNameEl.parentElement.classList.add("hidden");
    } else {
      groupNameEl.parentElement.classList.remove("hidden");
      allValues.push(destiny);
      checkKarmic(destinyResult.raw);
      groupNameEl.appendChild(createResultCard("デスティニーナンバー", destiny, NUMBER_MEANINGS, true, false, "destiny"));

      const soul = calcSoulNumber(letters);
      if (soul !== null) {
        allValues.push(soul);
        groupNameEl.appendChild(createResultCard("ソウルナンバー", soul, NUMBER_MEANINGS, false, false, "soul"));
      }

      const personality = calcPersonalityNumber(letters);
      if (personality !== null) {
        allValues.push(personality);
        groupNameEl.appendChild(createResultCard("パーソナリティナンバー", personality, NUMBER_MEANINGS, false, false, "personality"));
      }

      const lifeLessonNumbers = calcLifeLessonNumbers(letters);
      if (lifeLessonNumbers !== null) {
        lifeLessonNumbers.forEach((v) => allValues.push(v));
        groupNameEl.appendChild(createMultiNumberCard(
          "ライフレッスンナンバー",
          lifeLessonNumbers,
          LIFE_LESSON_MEANINGS,
          "お名前の中に1〜9のすべての数字が含まれており、特に意識すべき数字は見当たりません。",
          false,
          "lifeLesson"
        ));
      }

      const intensityNumbers = calcIntensityNumbers(letters);
      if (intensityNumbers !== null && intensityNumbers.length > 0) {
        intensityNumbers.forEach((v) => allValues.push(v));
        groupNameEl.appendChild(createMultiNumberCard(
          "インテンシティナンバー",
          intensityNumbers,
          NUMBER_MEANINGS,
          "",
          false,
          "intensity"
        ));
      }
    }

    const maturity = calcMaturityNumber(lifePath.value, destiny);
    if (maturity === null) {
      groupCombinedWrapEl.classList.add("hidden");
    } else {
      groupCombinedWrapEl.classList.remove("hidden");
      allValues.push(maturity);
      groupCombinedEl.innerHTML = "";
      groupCombinedEl.appendChild(createResultCard("成熟数（マチュリティナンバー）", maturity, NUMBER_MEANINGS, true, false, "maturity"));
    }

    const masterHits = allValues.filter(isMaster);
    if (masterHits.length > 0) {
      masterSummaryEl.textContent = `マスターナンバーが含まれています（${[...new Set(masterHits)].join("、")}）`;
      masterSummaryEl.classList.remove("hidden");
    } else {
      masterSummaryEl.classList.add("hidden");
    }

    if (karmicHits.length > 0) {
      const notes = [...new Set(karmicHits)].map((n) => `${n}（${KARMIC_DEBT_MEANINGS[n]}）`).join(" ");
      karmicSummaryEl.textContent = `カルミックデット・ナンバーが見られます：${notes}`;
      karmicSummaryEl.classList.remove("hidden");
    } else {
      karmicSummaryEl.classList.add("hidden");
    }

    resultsEl.classList.remove("hidden");
  });

  // ---------------- Number glossary modal ----------------
  const infoModal = document.getElementById("info-modal");
  const infoModalClose = document.getElementById("info-modal-close");
  const infoModalTitle = document.getElementById("info-modal-title");
  const infoModalBody = document.getElementById("info-modal-body");

  function openInfoModal(entry) {
    infoModalTitle.textContent = entry.title;
    infoModalBody.textContent = entry.body;
    infoModal.classList.remove("hidden");
  }

  infoModalClose.addEventListener("click", () => {
    infoModal.classList.add("hidden");
  });

  infoModal.addEventListener("click", (e) => {
    if (e.target === infoModal) infoModal.classList.add("hidden");
  });

  // ---------------- Modern-romaji reference/input table ----------------
  // Lets someone who only knows the kana for their name (and not modern
  // Hepburn romanization) tap out the correct spelling instead of guessing —
  // the whole reason this exists is so they don't write "si" for し.
  // 苗字・名前それぞれ別に「1つ戻す」できるよう、欄ごとに履歴を分けて持つ。
  const insertHistories = new WeakMap([[lastNameInput, []], [firstNameInput, []]]);
  let pendingSokuon = false;
  let sokuonKeyEl = null;

  function insertRomaji(text) {
    activeNameInput.value += text;
    insertHistories.get(activeNameInput).push(text.length);
    activeNameInput.focus();
  }

  function clearPendingSokuon() {
    pendingSokuon = false;
    if (sokuonKeyEl) sokuonKeyEl.classList.remove("active");
    sokuonKeyEl = null;
  }

  // 促音「っ」の直後の子音を重ねる際、ち・ちゃ・ちゅ・ちょ（chi/cha/chu/cho）
  // だけは c を重ねて cchi とはせず、t を補って tchi と表記する（ヘボン式の慣例）。
  function applySokuon(romaji) {
    if (/^[aiueo]/.test(romaji)) return romaji;
    if (romaji.startsWith("ch")) return "t" + romaji;
    return romaji[0] + romaji;
  }

  // ---------------- Kana → romaji auto-conversion ----------------
  // Lets someone type their name in kana directly (via the device's own
  // Japanese keyboard) and have it become Hepburn romaji automatically,
  // instead of needing the tap table below. Reuses the exact same
  // KANA_SECTIONS data and the same sokuon/long-vowel/n rules as the tap
  // table, so the two stay consistent by construction.
  const ROMAJI_MAP = {};
  KANA_SECTIONS.forEach((section) => {
    section.items.forEach(([kana, romaji]) => {
      ROMAJI_MAP[kana] = romaji;
    });
  });
  // ヴ単体の入力（濁点キー等）はひらがな化すると「ゔ」になるため、タップ表の
  // 「ヴ」行と同じ変換先を、ひらがな側のキーとしても登録しておく。
  ROMAJI_MAP["ゔぁ"] = "ba";
  ROMAJI_MAP["ゔぃ"] = "bi";
  ROMAJI_MAP["ゔ"] = "bu";
  ROMAJI_MAP["ゔぇ"] = "be";
  ROMAJI_MAP["ゔぉ"] = "bo";

  // カタカナはひらがなと同じ並びでUnicode上+0x60ずれているだけなので、
  // オフセットで変換する（ー等、この範囲に無い文字はそのまま残る）。
  function katakanaToHiragana(str) {
    return str.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  }

  // タップ表（handleKanaKeyClick）と同じルールを、1文字ずつのクリックではなく
  // 文字列全体に対して適用する版。すでにローマ字化済みの部分（a-z等）はどの
  // キーにも一致しないため、そのまま素通りする。
  function convertKanaToRomaji(input) {
    const src = katakanaToHiragana(input);
    let out = "";
    let i = 0;
    let pendingSokuonLocal = false;
    while (i < src.length) {
      const ch = src[i];
      if (ch === "っ") {
        pendingSokuonLocal = true;
        i += 1;
        continue;
      }
      if (ch === "ー") {
        i += 1;
        continue;
      }
      const two = src.slice(i, i + 2);
      let romaji;
      let consumed;
      if (Object.prototype.hasOwnProperty.call(ROMAJI_MAP, two)) {
        romaji = ROMAJI_MAP[two];
        consumed = 2;
      } else if (Object.prototype.hasOwnProperty.call(ROMAJI_MAP, ch)) {
        romaji = ROMAJI_MAP[ch];
        consumed = 1;
      } else {
        out += ch;
        i += 1;
        continue;
      }
      if (pendingSokuonLocal) {
        out += applySokuon(romaji);
        pendingSokuonLocal = false;
        i += consumed;
        continue;
      }
      const lastChar = out.slice(-1);
      if (VOWELS.has(romaji) && (romaji === lastChar || (romaji === "u" && lastChar === "o"))) {
        i += consumed;
        continue;
      }
      if (lastChar === "n" && /^[pbm]/.test(romaji)) {
        out = out.slice(0, -1) + "m" + romaji;
      } else if (lastChar === "n" && /^[aiueoy]/.test(romaji)) {
        out += "'" + romaji;
      } else {
        out += romaji;
      }
      i += consumed;
    }
    return out;
  }

  // 漢字などはひらがな・カタカナのどのキーにも一致せずそのまま素通りするため、
  // 気づかないまま計算対象から外れてしまう（nameLettersがa-z以外を除外する
  // ため）。変換後も苗字・名前どちらかにかな・漢字が残っていたら、注意書きを出す。
  function checkNameWarning() {
    const pattern = /[぀-ヿ一-鿿]/;
    const hasUnconverted = pattern.test(lastNameInput.value) || pattern.test(firstNameInput.value);
    nameWarningEl.classList.toggle("hidden", !hasUnconverted);
  }

  // かな入力の途中（拗音・ヴ行の2文字目や、モバイル特有の「小さい文字」への
  // 直前トグルなど）で早まって変換してしまうと、きゃ→ki+ゃ のように壊れる。
  // そのため入力のたびに即変換はせず、少し打鍵が止まってから変換する。
  // IME変換中（isComposing）も同様に、確定するまでは手を出さない。
  // 苗字・名前は別々に打つので、待ちタイマーも欄ごとに独立させる。
  const autoConvertTimers = new WeakMap();
  function runAutoConvert(inputEl) {
    const before = inputEl.value;
    const converted = convertKanaToRomaji(before);
    inputEl.classList.remove("romaji-pending");
    if (converted !== before) {
      inputEl.value = converted;
      // タップ表のキーと同じ「一瞬光る」フィードバックを入力欄自体にも与え、
      // 変換が起きたことに気づきやすくする（無音で0.5秒待つだけだと、初心者は
      // 何も起きていないと思いやすい）。
      inputEl.classList.add("romaji-flash");
      setTimeout(() => inputEl.classList.remove("romaji-flash"), 400);
    }
    checkNameWarning();
  }
  function scheduleAutoConvert(inputEl) {
    clearTimeout(autoConvertTimers.get(inputEl));
    // かなが含まれているときだけ「変換待ち」の見た目にする。普通にローマ字を
    // 直接タイプしている人まで毎回薄く点滅して見えるのを避けるため。
    if (/[぀-ヿ]/.test(inputEl.value)) {
      inputEl.classList.add("romaji-pending");
    }
    autoConvertTimers.set(inputEl, setTimeout(() => runAutoConvert(inputEl), 500));
  }
  function setupNameAutoConvert(inputEl) {
    inputEl.addEventListener("focus", () => {
      activeNameInput = inputEl;
    });
    inputEl.addEventListener("input", (e) => {
      if (e.isComposing) return;
      scheduleAutoConvert(inputEl);
    });
    inputEl.addEventListener("compositionend", () => {
      clearTimeout(autoConvertTimers.get(inputEl));
      runAutoConvert(inputEl);
    });
    inputEl.addEventListener("blur", () => {
      clearTimeout(autoConvertTimers.get(inputEl));
      runAutoConvert(inputEl);
    });
  }
  setupNameAutoConvert(lastNameInput);
  setupNameAutoConvert(firstNameInput);

  // 長音の省略（大野＝おおの→ono など）で2回目のタップが何も追加しないとき、
  // 初心者ほど「タップが反応していない」と誤解しやすい。タップ自体は効いている
  // ことが分かるよう、対象のキーを一瞬光らせて視覚フィードバックを返す。
  function flashKey(keyEl) {
    if (!keyEl) return;
    keyEl.classList.add("flash");
    setTimeout(() => keyEl.classList.remove("flash"), 350);
  }

  function handleKanaKeyClick(romaji, keyEl) {
    if (pendingSokuon) {
      const doubled = applySokuon(romaji);
      clearPendingSokuon();
      insertRomaji(doubled);
      return;
    }
    // 長音は、パスポートのヘボン式ローマ字綴方表（外務省）の原則どおり、
    // 「同じ母音が連続する場合は2つ目を書かない」で網羅する：
    //   あ段+あ→a（例：ばあ→ba）　い段+い→i（例：井伊＝いい→Ii）
    //   う段+う→u（例：すう→su）　え段+え→e（例：ねえ→ne）
    //   お段+お→o（例：とおい→to、大野＝おおの→ono）
    // 「お段+う」（おう＝長音のお、日本語で最も多いパターン）だけは母音の文字
    // 自体は異なる（o→u）ため、別途 lastChar==="o" を明示的に見て拾う
    // （例：太郎＝たろう→Taro、東京＝とうきょう→Tokyo、八丁＝はっちょう→hatcho）。
    // 逆に「え段+い」（けいこ等）はhepburnでは省略しない例外なので、
    // 同じ母音同士のときしか反応しないこのロジックでは自然に対象外のままになる。
    const lastChar = activeNameInput.value.slice(-1);
    if (VOWELS.has(romaji) && (romaji === lastChar || (romaji === "u" && lastChar === "o"))) {
      flashKey(keyEl);
      return;
    }
    // ん（末尾がn）の直後にま・ば・ぱ行が続く場合は、ヘボン式の慣例に合わせて
    // n を m に書き換える（例：三瓶＝さんぺい→sampei、難波＝なんば→namba）。
    // 直前に何が入力されたかではなく、入力欄の実際の末尾文字を見て判定するため、
    // 手動編集で欄の中身が変わっていても正しく動く。
    if (lastChar === "n" && /^[pbm]/.test(romaji)) {
      activeNameInput.value = activeNameInput.value.slice(0, -1) + "m";
      insertRomaji(romaji);
      return;
    }
    // 「ん」の直後に母音（あ・い・う・え・お）や・ゆ・よが続くと、区切りが
    // わからず別の1文字（な行・にゃ行など）に読めてしまうため、ヘボン式では
    // アポストロフィを挟んで区切りを明示する（例：純一＝じゅんいち→jun'ichi、
    // 本位＝ほんい→hon'i、金融＝きんゆう→kin'yu）。
    if (lastChar === "n" && /^[aiueoy]/.test(romaji)) {
      insertRomaji("'" + romaji);
      return;
    }
    insertRomaji(romaji);
  }

  // 「おおの」のお試し再生（romajiDemoBtn）が、実在するキー要素を見つけて
  // 本物のクリックとして発火させるためのルックアップ。
  const kanaKeyMap = {};

  romajiTableBody.innerHTML = "";
  KANA_SECTIONS.forEach((section) => {
    const titleEl = document.createElement("div");
    titleEl.className = "romaji-section-title";
    titleEl.textContent = section.title;
    romajiTableBody.appendChild(titleEl);

    const gridEl = document.createElement("div");
    gridEl.className = "romaji-grid";
    section.items.forEach(([kana, romaji]) => {
      const keyEl = document.createElement("button");
      keyEl.type = "button";
      keyEl.className = "romaji-key";
      keyEl.innerHTML = `<span class="k">${kana}</span><span class="r">${romaji}</span>`;
      keyEl.addEventListener("click", () => handleKanaKeyClick(romaji, keyEl));
      kanaKeyMap[kana] = keyEl;
      gridEl.appendChild(keyEl);
    });
    romajiTableBody.appendChild(gridEl);
  });

  // 促音「っ」・長音「ー」は単独では読み方が定まらないため、他のかなと同じ
  // ボタンにはせず、直後の入力に作用する特殊キーとして別枠で扱う。
  const specialTitleEl = document.createElement("div");
  specialTitleEl.className = "romaji-section-title";
  specialTitleEl.textContent = "促音・長音";
  romajiTableBody.appendChild(specialTitleEl);

  const specialGridEl = document.createElement("div");
  specialGridEl.className = "romaji-grid";

  const sokuonKey = document.createElement("button");
  sokuonKey.type = "button";
  sokuonKey.className = "romaji-key";
  sokuonKey.innerHTML = `<span class="k">っ</span><span class="r">次を重ねる</span>`;
  sokuonKey.addEventListener("click", () => {
    if (pendingSokuon) {
      clearPendingSokuon();
    } else {
      pendingSokuon = true;
      sokuonKeyEl = sokuonKey;
      sokuonKey.classList.add("active");
    }
  });
  specialGridEl.appendChild(sokuonKey);

  // ー（音引き）はヘボン式の一般的な慣例に合わせ、他の長音（お段+う、う段+う）
  // と同じく伸ばす分の文字を書かない（例：ヴォードレール→bodoreru）。押しても
  // 何も入力されない旨がひと目でわかるよう、ボタン自体にそう表示した上で、
  // タップ時に一瞬光らせて「反応はしている」ことも伝える。
  const chouonKey = document.createElement("button");
  chouonKey.type = "button";
  chouonKey.className = "romaji-key";
  chouonKey.innerHTML = `<span class="k">ー</span><span class="r">表記なし</span>`;
  chouonKey.addEventListener("click", () => flashKey(chouonKey));
  specialGridEl.appendChild(chouonKey);

  romajiTableBody.appendChild(specialGridEl);

  romajiSpaceBtn.addEventListener("click", () => insertRomaji(" "));

  romajiUndoBtn.addEventListener("click", () => {
    const history = insertHistories.get(activeNameInput);
    const lastLength = history.pop();
    if (!lastLength) return;
    activeNameInput.value = activeNameInput.value.slice(0, -lastLength);
    activeNameInput.focus();
  });

  romajiCloseBtn.addEventListener("click", () => {
    romajiTablePanel.classList.add("hidden");
    romajiToggleBtn.textContent = "ヘボン式ローマ字表を見ながら入力する";
    clearPendingSokuon();
  });

  romajiToggleBtn.addEventListener("click", () => {
    const isHidden = romajiTablePanel.classList.toggle("hidden");
    romajiToggleBtn.textContent = isHidden
      ? "ヘボン式ローマ字表を見ながら入力する"
      : "ローマ字表を閉じる";
    if (isHidden) clearPendingSokuon();
  });

  // 文章で例を並べる代わりに、実際にタップされる様子を1回再生して見せる
  // お試しボタン。「おおの→ono」で長音の省略を体感してもらうことで、他の
  // 名前でも同じ仕組みが働くことが（大野さん限定の説明ではなく）伝わる。
  romajiDemoBtn.addEventListener("click", () => {
    if (romajiTablePanel.classList.contains("hidden")) {
      romajiTablePanel.classList.remove("hidden");
      romajiToggleBtn.textContent = "ローマ字表を閉じる";
    }
    activeNameInput.value = "";
    romajiDemoBtn.disabled = true;
    const demoKana = ["お", "お", "の"];
    let i = 0;
    function playNext() {
      if (i >= demoKana.length) {
        setTimeout(() => {
          activeNameInput.value = "";
          romajiDemoBtn.disabled = false;
        }, 900);
        return;
      }
      const keyEl = kanaKeyMap[demoKana[i]];
      if (keyEl) keyEl.click();
      i += 1;
      setTimeout(playNext, 650);
    }
    playNext();
  });
})();
