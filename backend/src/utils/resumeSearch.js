const STOPWORDS = new Set(['a', 'an', 'and', 'the', 'of', 'in', 'for', 'with', 'at', 'to', 'on', 'or']);
const WEIGHTS = { name: 5, company: 4, keyword: 3, major: 2, year: 1 };
const RRF_K = 60;

const clean = (value) => {
  const text = String(value || '').trim();
  return text.toLowerCase() === 'unspecified' ? '' : text;
};

const parseYear = (value) => {
  const years = String(value || '').match(/\b(19|20)\d{2}\b/g);
  return years ? years.map(Number).sort().pop() : null;
};

const classStatus = (year, now = new Date()) => {
  if (!year) return null;
  const current = now.getFullYear();
  return year < current || (year === current && now.getMonth() >= 5) ? 'alumni' : 'student';
};

const tokenize = (q) =>
  q
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/^[^a-z0-9+#]+|[^a-z0-9+#]+$/g, ''))
    .filter((t) => t && !STOPWORDS.has(t));

const acronym = (text) => {
  const words = text.split(/\s+/).filter((w) => w && !STOPWORDS.has(w));
  return words.length > 1 ? words.map((w) => w[0]).join('') : '';
};

const words = (value) => value.split(/[\s,/&()-]+/).filter(Boolean);

const tokenMatches = (token, value) =>
  value === token || words(value).some((word) => word.startsWith(token)) || acronym(value) === token;

const phraseMatches = (phrase, value) => ` ${words(value).join(' ')}`.includes(` ${phrase}`);

const reasonFor = (field, value) =>
  ({
    company: `Worked at ${value}`,
    keyword: `Skill: ${value}`,
    major: `Major: ${value}`,
    year: `Class of ${value}`,
  })[field];

const searchFields = (resume) => [
  { field: 'name', value: resume.name },
  ...resume.companies.map((value) => ({ field: 'company', value })),
  ...resume.keywords.map((value) => ({ field: 'keyword', value })),
  { field: 'major', value: resume.major },
  { field: 'year', value: resume.year ? String(resume.year) : '' },
].filter((f) => f.value);

const keywordMatch = (resume, q) => {
  const phrase = words(q.trim().toLowerCase()).join(' ');
  const tokens = tokenize(q);
  if (!phrase) return null;

  const fields = searchFields(resume).map((f) => ({ ...f, lower: f.value.toLowerCase() }));
  const hits = new Map();
  const hit = (f, weight) => {
    const key = `${f.field}:${f.value}`;
    if (!hits.has(key) || hits.get(key).weight < weight) hits.set(key, { ...f, weight });
  };

  let score = 0;
  const phraseFields = fields.filter((f) => phraseMatches(phrase, f.lower));
  phraseFields.forEach((f) => hit(f, WEIGHTS[f.field] * 2));
  if (phraseFields.length) score += Math.max(...phraseFields.map((f) => WEIGHTS[f.field] * 2));

  let matchedTokens = 0;
  for (const token of tokens) {
    const matched = fields.filter((f) => tokenMatches(token, f.lower));
    if (!matched.length) continue;
    matchedTokens += 1;
    matched.forEach((f) => hit(f, WEIGHTS[f.field]));
    score += Math.max(...matched.map((f) => WEIGHTS[f.field]));
  }
  if (!matchedTokens && !phraseFields.length) return null;
  const complete = phraseFields.length > 0 || matchedTokens === tokens.length;

  const reasons = [...hits.values()]
    .filter((h) => h.field !== 'name')
    .sort((a, b) => b.weight - a.weight)
    .map((h) => reasonFor(h.field, h.value))
    .filter((r, i, all) => all.indexOf(r) === i)
    .slice(0, 2);

  return { score, reasons, complete };
};

const fuse = (rankings) => {
  const scores = new Map();
  for (const ranking of rankings) {
    ranking.forEach((id, index) => scores.set(id, (scores.get(id) || 0) + 1 / (RRF_K + index + 1)));
  }
  return scores;
};

const cosineSimilarity = (a = [], b = []) => {
  if (!a.length || a.length !== b.length) return -1;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : -1;
};

const countBy = (resumes, pick) => {
  const counts = new Map();
  for (const resume of resumes) {
    for (const value of new Set(pick(resume))) {
      if (value) counts.set(value, (counts.get(value) || 0) + 1);
    }
  }
  return [...counts].map(([value, count]) => ({ value, count }));
};

const byCountThenName = (a, b) => b.count - a.count || a.value.localeCompare(b.value);

module.exports = {
  clean,
  parseYear,
  classStatus,
  keywordMatch,
  fuse,
  cosineSimilarity,
  countBy,
  byCountThenName,
};
