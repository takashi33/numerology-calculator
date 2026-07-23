(() => {
  const form = document.getElementById("calc-form");
  const birthdateInput = document.getElementById("birthdate");
  const nameInput = document.getElementById("name");
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

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove("hidden");
    resultsEl.classList.add("hidden");
  }

  function createResultCard(label, value, meaningMap, wide, main) {
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

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    errorMessage.classList.add("hidden");

    const birthdateValue = birthdateInput.value;
    if (!birthdateValue) {
      showError("生年月日を入力してください。");
      return;
    }

    const [yearStr, monthStr, dayStr] = birthdateValue.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if (!year || !month || !day) {
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
    groupBasic3El.appendChild(createResultCard("バースデーナンバー", birthday, NUMBER_MEANINGS));

    const lifePath = calcLifePathNumber(year, month, day);
    allValues.push(lifePath.value);
    checkKarmic(lifePath.raw);
    groupBasic3El.appendChild(createResultCard("ライフパスナンバー", lifePath.value, NUMBER_MEANINGS, false, true));

    const challengeNumber = calcChallengeNumber(month, day);
    allValues.push(challengeNumber);
    groupBasic3El.appendChild(createResultCard("チャレンジナンバー", challengeNumber, CHALLENGE_MEANINGS));

    const currentYear = new Date().getFullYear();
    const personalYear = calcPersonalYearNumber(lifePath.rMonth, lifePath.rDay, currentYear);
    allValues.push(personalYear);
    personalYearHeadingEl.textContent = `今年（${currentYear}年）の数字（パーソナルイヤーナンバー）`;
    groupPersonalYearEl.appendChild(createResultCard(`${currentYear}年のパーソナルイヤーナンバー`, personalYear, NUMBER_MEANINGS, true));

    const ageRanges = calcPinnacleAgeRanges(lifePath.value);
    const periodTags = ["人生前半", "人生中盤", "メイン", "人生後半"];

    const challenges = calcChallengeNumbers(lifePath.rMonth, lifePath.rDay, lifePath.rYear);
    challenges.forEach((c, i) => {
      allValues.push(c);
      const label = `第${i + 1}チャレンジ（${periodTags[i]}・${formatAgeRange(ageRanges[i])}）`;
      groupChallengeDetailEl.appendChild(createResultCard(label, c, CHALLENGE_MEANINGS));
    });

    const pinnacles = calcPinnacleNumbers(lifePath.rMonth, lifePath.rDay, lifePath.rYear);
    pinnacles.forEach((p, i) => {
      allValues.push(p);
      const label = `第${i + 1}ピナクル（${periodTags[i]}・${formatAgeRange(ageRanges[i])}）`;
      groupPinnacleDetailEl.appendChild(createResultCard(label, p, NUMBER_MEANINGS));
    });

    const letters = nameLetters(nameInput.value);
    const destinyResult = calcDestinyNumber(letters);
    const destiny = destinyResult ? destinyResult.value : null;
    if (destinyResult === null) {
      groupNameEl.parentElement.classList.add("hidden");
    } else {
      groupNameEl.parentElement.classList.remove("hidden");
      allValues.push(destiny);
      checkKarmic(destinyResult.raw);
      groupNameEl.appendChild(createResultCard("デスティニーナンバー", destiny, NUMBER_MEANINGS, true));

      const soul = calcSoulNumber(letters);
      if (soul !== null) {
        allValues.push(soul);
        groupNameEl.appendChild(createResultCard("ソウルナンバー", soul, NUMBER_MEANINGS));
      }

      const personality = calcPersonalityNumber(letters);
      if (personality !== null) {
        allValues.push(personality);
        groupNameEl.appendChild(createResultCard("パーソナリティナンバー", personality, NUMBER_MEANINGS));
      }
    }

    const maturity = calcMaturityNumber(lifePath.value, destiny);
    if (maturity === null) {
      groupCombinedWrapEl.classList.add("hidden");
    } else {
      groupCombinedWrapEl.classList.remove("hidden");
      allValues.push(maturity);
      groupCombinedEl.innerHTML = "";
      groupCombinedEl.appendChild(createResultCard("成熟数（マチュリティナンバー）", maturity, NUMBER_MEANINGS, true));
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
})();
