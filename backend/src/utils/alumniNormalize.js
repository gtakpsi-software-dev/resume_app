const crypto = require('crypto');

const text = (value) => String(value || '').replace(/[​-‏‪-‮]/g, '').replace(/\s+/g, ' ').trim();

const titleCase = (value) =>
  value === value.toLowerCase() || value === value.toUpperCase()
    ? value.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase())
    : value;

const DECEASED = /deceased|passed away|obituar/i;
const RETIRED = /^retired$/i;
const EMPTY_INDUSTRY = /^(na|n\/a|none|not listed.*)$/i;

const INDUSTRY_RULES = [
  ['Student', /\bstudent\b/],
  ['Software Engineering', /\b(swe|software|developer|cyber ?security|systems engineer)/],
  ['Product', /\bproduct\b|\bux\b|user research/],
  ['Data & Analytics', /analytic|\bdata\b/],
  ['Consulting', /consult|advisory/],
  ['Finance', /financ|fintech|bank|wealth|investment|private equity|mortgage|insurance|crypto/],
  ['Accounting', /account|tax|audit/],
  ['Law', /\blaw\b|lawyer|legal/],
  ['Healthcare', /health|medic|pharma|biotech|bioscience|urology|hospital/],
  ['Education', /educat|academ|university/],
  ['Supply Chain & Logistics', /supply chain|logistic|procure|sourcing|delivery|transport|fulfillment/],
  ['Marketing & Sales', /marketing|sales|advertis|brand|communicat/],
  ['People & HR', /human|\bhr\b|talent/],
  ['Entrepreneurship', /entrep|entrepen|startup|business coaching/],
  ['Real Estate & Construction', /real estate|construct|architect|homes|home improvement|landscap|kitchen/],
  ['Aerospace & Defense', /aerospace|aviation|defense|airforce/],
  ['Energy & Utilities', /energy|utilit|lithium/],
  ['Manufacturing', /manufactur|industrial|automotive|chemical|textile/],
  ['Engineering', /engineer|\bbme\b/],
  ['Technology', /tech|techn|tehc|techo|\bit\b|e-commerce|digital/],
  ['Business & Operations', /project|program|operations|strategy|business|buisness|services/],
  ['Research', /research|economics/],
  ['Government & Nonprofit', /non-?profit|public|politic|government|theolog|pastor/],
  ['Retail & Consumer', /retail|food|beverage|fashion|jewelry|fitness|hospitality|entertainment|theater|consumer/],
];

const industryBucket = (raw) => {
  const value = raw.toLowerCase();
  const match = INDUSTRY_RULES.find(([, rule]) => rule.test(value));
  return match ? match[0] : 'Other';
};

const DEGREE = /\b(b\.?s\.?|b\.?a\.?|bachelor'?s?( of (science|arts))?|bs and ba)\b[,:]?/gi;

const MAJOR_ALIASES = {
  ie: 'Industrial Engineering',
  isye: 'Industrial Engineering',
  'industrial engineer': 'Industrial Engineering',
  'industrial and systems engineering': 'Industrial Engineering',
  cs: 'Computer Science',
  me: 'Mechanical Engineering',
  business: 'Business Administration',
  buisness: 'Business Administration',
  'business adminstration': 'Business Administration',
  management: 'Management',
  'biomedical engineeering': 'Biomedical Engineering',
  'material science engineering': 'Materials Science and Engineering',
};

const normalizeMajor = (raw) => {
  let value = text(raw)
    .replace(DEGREE, '')
    .replace(/^[\s,&+-]+|[\s,&+-]+$/g, '')
    .replace(/\bbuisness\b/gi, 'Business')
    .replace(/\badminstration\b/gi, 'Administration')
    .trim();
  if (!value || /^(and|and business administration)$/i.test(value)) return null;
  const alias = MAJOR_ALIASES[value.toLowerCase()];
  if (alias) return alias;
  if (/^business\b.*\bitm\b/i.test(value)) return 'Business Administration';
  return value;
};

const TERMS = ['Spring', 'Summer', 'Fall', 'Winter'];

const parseTermYear = (raw) => {
  const value = text(raw);
  if (!value) return null;
  const dated = value.match(/^(\d{1,2})\/\d{1,2}\/(\d{4})$/);
  if (dated) return { year: Number(dated[2]), term: Number(dated[1]) <= 6 ? 'Spring' : 'Fall' };
  const term = TERMS.find((t) => new RegExp(`\\b${t}\\b`, 'i').test(value)) || null;
  const full = value.match(/\b(19|20)\d{2}\b/);
  if (full) return { year: Number(full[0]), term };
  const short = value.match(/\b(\d{2})\b/);
  if (short && term) return { year: 2000 + Number(short[1]), term };
  return null;
};

const US_STATES = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO', connecticut: 'CT',
  delaware: 'DE', 'district of columbia': 'DC', florida: 'FL', georgia: 'GA', hawaii: 'HI', idaho: 'ID',
  illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME',
  maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS', missouri: 'MO',
  montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM',
  'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR',
  pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN',
  texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA', 'west virginia': 'WV',
  wisconsin: 'WI', wyoming: 'WY',
};
const STATE_CODES = new Set(Object.values(US_STATES));
const STATE_FIXES = { PN: 'PA', KA: 'KS' };

const normalizeRegion = (raw) => {
  const value = text(raw).replace(/\?$/, '');
  if (!value) return null;
  const upper = value.toUpperCase();
  if (STATE_FIXES[upper]) return STATE_FIXES[upper];
  if (STATE_CODES.has(upper)) return upper;
  return US_STATES[value.toLowerCase()] || value;
};

const linkedinUrl = (...candidates) => {
  for (const candidate of candidates) {
    const value = text(candidate);
    const match = value.match(/(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/(in|pub|profile)\/[^\s"'<>]+/i);
    if (match) return `https://www.${match[0].replace(/^(https?:\/\/)?([a-z]{2,3}\.)?/i, '')}`;
  }
  return null;
};

const normalizeEmail = (raw) => {
  const value = text(raw).toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) ? value : null;
};

const normalizePhone = (...candidates) => {
  for (const candidate of candidates) {
    let digits = text(candidate).replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
    if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return null;
};

const importKey = (row) => {
  const basis = row.email || [row.firstName, row.lastName, row.pledgeClass?.year, row.pledgeClass?.term].join('|').toLowerCase();
  return crypto.createHash('sha256').update(basis).digest('hex').slice(0, 24);
};

const normalizeRow = (row) => {
  const industryRaw = text(row['Industry']);
  const deceased = DECEASED.test(industryRaw);
  const retired = RETIRED.test(industryRaw);
  const industryKnown = industryRaw && !deceased && !retired && !EMPTY_INDUSTRY.test(industryRaw);
  const firstName = titleCase(text(row['First Name']));
  const lastName = titleCase(text(row['Last Name']));

  const alum = {
    firstName,
    lastName,
    name: [firstName, lastName].filter(Boolean).join(' '),
    status: deceased ? 'deceased' : retired ? 'retired' : 'active',
    industry: industryKnown ? industryBucket(industryRaw) : null,
    industryRaw: industryKnown ? industryRaw : null,
    company: text(row['Company/School Name']) || null,
    position: text(row['Current Position']) || null,
    email: normalizeEmail(row['Email Address']),
    phone: normalizePhone(row['Phone #'], row['Phone Helper Column']),
    linkedin: linkedinUrl(row['LinkedIn'], row['LinkedIn Helper Column']),
    graduation: parseTermYear(row['Graduating Class']),
    major: normalizeMajor(row['Major']),
    majorRaw: text(row['Major']) || null,
    pledgeClass: parseTermYear(row['AKPsi Pledge Class']),
    chapterRoles: text(row['AKPsi History']) || null,
    city: text(row['City']) || null,
    region: normalizeRegion(row['State']),
  };
  alum.importKey = importKey(alum);
  return alum;
};

module.exports = { normalizeRow, industryBucket, normalizeMajor, parseTermYear, normalizeRegion, linkedinUrl, normalizePhone };
