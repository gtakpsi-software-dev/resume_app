const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const fs = require('fs');
const mongoose = require('mongoose');
const { parse } = require('csv-parse/sync');
const connectDB = require('../config/database');
const { Alumni } = require('../models');
const { normalizeRow } = require('../utils/alumniNormalize');

const EXPECTED = [
  'First Name', 'Last Name', 'Industry', 'Company/School Name', 'Current Position', 'Email Address',
  'Phone Helper Column', 'Phone #', 'LinkedIn Helper Column', 'LinkedIn', 'Graduating Class', 'Major',
  'AKPsi Pledge Class', 'AKPsi History', 'City', 'State',
];

const count = (alumni, pick) => alumni.filter(pick).length;

const run = async () => {
  const [file, flag] = process.argv.slice(2);
  if (!file) throw new Error('Usage: npm run alumni:import -- <file.csv> [--dry-run]');
  const dryRun = flag === '--dry-run';

  const rows = parse(fs.readFileSync(file), { columns: true, bom: true, skip_empty_lines: true, trim: true });
  const missing = EXPECTED.filter((h) => !(h in (rows[0] || {})));
  if (missing.length) throw new Error(`CSV is missing columns: ${missing.join(', ')}`);

  const alumni = rows.map(normalizeRow).filter((a) => a.name);

  const byName = new Map();
  alumni.forEach((a) => {
    const key = a.name.toLowerCase();
    byName.set(key, (byName.get(key) || 0) + 1);
  });
  alumni.forEach((a) => {
    a.possibleDuplicate = byName.get(a.name.toLowerCase()) > 1;
  });

  const unique = new Map(alumni.map((a) => [a.importKey, a]));

  console.log(`Rows read: ${rows.length}`);
  console.log(`Alumni to import: ${unique.size} (${alumni.length - unique.size} rows collapsed by identical key)`);
  console.log(`Deceased: ${count(alumni, (a) => a.status === 'deceased')}, retired: ${count(alumni, (a) => a.status === 'retired')}`);
  console.log(`With email: ${count(alumni, (a) => a.email)}, phone: ${count(alumni, (a) => a.phone)}, LinkedIn: ${count(alumni, (a) => a.linkedin)}`);
  console.log(`With graduation: ${count(alumni, (a) => a.graduation)}, pledge class: ${count(alumni, (a) => a.pledgeClass)}`);
  console.log(`With industry: ${count(alumni, (a) => a.industry)}, major: ${count(alumni, (a) => a.major)}, location: ${count(alumni, (a) => a.region)}`);
  console.log(`Possible duplicate names: ${count(alumni, (a) => a.possibleDuplicate)}`);

  if (dryRun) return;

  await connectDB();
  const result = await Alumni.bulkWrite(
    [...unique.values()].map((a) => ({
      updateOne: { filter: { importKey: a.importKey }, update: { $set: a }, upsert: true },
    }))
  );
  console.log(`New alumni: ${result.upsertedCount}, already present and refreshed: ${result.matchedCount}`);
};

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
