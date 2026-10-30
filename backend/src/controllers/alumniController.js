const { Alumni } = require('../models');

const STOPWORDS = new Set(['a', 'an', 'and', 'the', 'of', 'in', 'for', 'with', 'at', 'to', 'on', 'or']);

const tokenize = (q) =>
  q
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/^[^a-z0-9+#]+|[^a-z0-9+#]+$/g, ''))
    .filter((t) => t && !STOPWORDS.has(t));

const words = (value) => String(value || '').toLowerCase().split(/[\s,/&()-]+/).filter(Boolean);

const listParam = (value) => new Set(String(value || '').split(',').map((v) => v.trim()).filter(Boolean));

const decadeOf = (year) => (year ? `${Math.floor(year / 10) * 10}s` : null);

const classLabel = (a) => {
  if (a.graduation?.year) return `Class of ${a.graduation.year}`;
  if (a.pledgeClass?.year) return `Pledged ${[a.pledgeClass.term, a.pledgeClass.year].filter(Boolean).join(' ')}`;
  return '';
};

const score = (alum, tokens) => {
  let total = 0;
  for (const token of tokens) {
    const hit = alum.fields.find((f) => f.words.some((w) => w.startsWith(token)));
    if (!hit) return 0;
    total += hit.weight;
  }
  return total;
};

const listAlumni = async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const canSeeContact = isAdmin || process.env.ALUMNI_CONTACT_ACCESS === 'members';
    const q = String(req.query.q || '').trim();
    const tokens = tokenize(q);
    const filters = {
      industry: listParam(req.query.industry),
      location: listParam(req.query.location),
      decade: listParam(req.query.decade),
    };
    const sort = ['relevance', 'name', 'class'].includes(req.query.sort) ? req.query.sort : q ? 'relevance' : 'name';

    const docs = await Alumni.find(isAdmin ? {} : { status: { $ne: 'deceased' } })
      .select('-industryRaw -majorRaw -importKey -resume')
      .lean();

    const alumni = docs.map((a) => {
      const year = a.graduation?.year || a.pledgeClass?.year || null;
      const view = {
        id: String(a._id),
        name: a.name,
        industry: a.industry || null,
        company: a.company || null,
        position: a.position || null,
        classLabel: classLabel(a),
        classYear: a.graduation?.year || null,
        decade: decadeOf(year),
        sortYear: year,
        major: a.major || null,
        location: [a.city, a.region].filter(Boolean).join(', ') || null,
        region: a.region || null,
        linkedin: a.linkedin || null,
        chapterRoles: a.chapterRoles || null,
        hasContact: Boolean(a.email || a.phone),
        ...(canSeeContact && { email: a.email || null, phone: a.phone || null }),
        ...(isAdmin && { status: a.status, possibleDuplicate: a.possibleDuplicate }),
      };
      view.fields = [
        { weight: 5, words: words(a.name) },
        { weight: 4, words: words(a.company) },
        { weight: 3, words: [...words(a.position), ...words(a.industry)] },
        { weight: 2, words: [...words(a.major), ...words(a.chapterRoles)] },
        { weight: 1, words: [...words(a.city), ...words(a.region), ...words(view.classLabel)] },
      ];
      view.score = tokens.length ? score(view, tokens) : 0;
      return view;
    });

    const matched = tokens.length ? alumni.filter((a) => a.score > 0) : alumni;

    const passes = (a, except) =>
      (except === 'industry' || !filters.industry.size || filters.industry.has(a.industry)) &&
      (except === 'location' || !filters.location.size || filters.location.has(a.region)) &&
      (except === 'decade' || !filters.decade.size || filters.decade.has(a.decade));

    const countBy = (key, except) => {
      const counts = new Map();
      matched.filter((a) => passes(a, except)).forEach((a) => a[key] && counts.set(a[key], (counts.get(a[key]) || 0) + 1));
      return [...counts].map(([value, count]) => ({ value, count }));
    };

    const byCount = (a, b) => b.count - a.count || a.value.localeCompare(b.value);
    const facets = {
      industries: countBy('industry', 'industry').sort(byCount),
      locations: countBy('region', 'location').sort(byCount),
      decades: countBy('decade', 'decade').sort((a, b) => b.value.localeCompare(a.value)),
    };

    const byName = (a, b) => a.name.localeCompare(b.name);
    const sorters = {
      relevance: (a, b) => b.score - a.score || byName(a, b),
      name: byName,
      class: (a, b) => (b.sortYear || 0) - (a.sortYear || 0) || byName(a, b),
    };

    const data = matched
      .filter((a) => passes(a))
      .sort(sorters[sort])
      .map(({ fields, score: _score, sortYear, ...rest }) => rest);

    res.status(200).json({ error: false, count: data.length, canSeeContact, data, facets });
  } catch (error) {
    console.error('List alumni error:', error);
    res.status(500).json({ error: true, message: 'Error loading alumni.' });
  }
};

module.exports = { listAlumni };
