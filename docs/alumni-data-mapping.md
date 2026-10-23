# Alumni data mapping

How the chapter's alumni spreadsheet becomes the `alumni` collection behind the Alumni page. The import lives in `backend/src/scripts/importAlumni.js` and the cleanup rules in `backend/src/utils/alumniNormalize.js`.

The Spring 2026 export has 1,373 rows and 16 columns. Most rows are sparse: 556 have nothing beyond a name.

## Column mapping

| CSV column | Field | Visibility | Rule |
|---|---|---|---|
| First Name | `firstName` | Members | Trimmed. All-lowercase or all-caps names are title-cased. |
| Last Name | `lastName` | Members | Same as first name. `name` is both joined. |
| Industry | `industry`, `industryRaw` | Members (`industry` only) | 180 free-text values grouped into about 25 industries. "Deceased", "Passed away", or an obituary link sets `status: deceased` instead. "Retired" sets `status: retired`. "NA" and "Not listed" are dropped. |
| Company/School Name | `company` | Members | Trimmed, otherwise as written. |
| Current Position | `position` | Members | Trimmed. Shown as "Position at Company". |
| Email Address | `email` | Restricted | Lowercased and kept only if it looks like an email. |
| Phone # | `phone` | Restricted | Digits only, formatted `(xxx) xxx-xxxx`. Only 10-digit US numbers are kept. |
| Phone Helper Column | `phone` | Restricted | Used when Phone # is empty or invalid. |
| LinkedIn | `linkedin` | Members | Kept only if it is a `linkedin.com/in`, `/pub`, or `/profile` URL. `https://www.` is added when missing. |
| LinkedIn Helper Column | `linkedin` | Members | Used when the LinkedIn cell holds the word "LinkedIn" instead of a URL. |
| Graduating Class | `graduation.year`, `graduation.term` | Members | "Spring 2026", "2020 Spring", "2018", and "Spring 25" all parse. |
| Major | `major`, `majorRaw` | Members (`major` only) | Degree words (BS, BA, Bachelor of Science) are removed. Abbreviations and typos are fixed (IE, CS, ISYE, Buisness). Values that were only a degree become empty. |
| AKPsi Pledge Class | `pledgeClass.year`, `pledgeClass.term` | Members | Dates like 1/13/2000 become Spring 2000. Months July to December become Fall. |
| AKPsi History | `chapterRoles` | Members | As written. Shown under "In the chapter". |
| City | `city` | Members | Trimmed. |
| State | `region` | Members | Full state names become codes, and typos are fixed (PN to PA, KA to KS). Countries are kept as written. |

Fields added by the import:

- **`importKey`:** the stable identity used to update records on re-import. It is a hash of the email, or of name plus pledge class when there is no email.
- **`status`:** active, retired, or deceased.
- **`possibleDuplicate`:** true when another row has the same full name.
- **`resume`:** empty for now. It is reserved for linking an alum to their resume.

## Display rules

- **Class line:** "Class of 2023" when a graduation year exists, otherwise "Pledged Fall 1987", otherwise nothing.
- **Decade filter:** uses graduation year, falling back to pledge year.
- **Empty fields:** hidden, never shown as "N/A" or "Not found".
- **Name-only records:** show the name and the sentence "This is all the chapter has on file".
- **LinkedIn:** a button appears only when the URL passed validation.

## Privacy rules

- **Members** see every member-visible field above. Restricted fields are not sent to their browser at all.
- **Email and phone** go to admins only by default. Setting `ALUMNI_CONTACT_ACCESS=members` on the backend sends them to all signed-in members. When contacts are hidden and the alum has one on file, members see "Ask an officer to connect you".
- **Deceased alumni** are hidden from members and still visible to admins so the data can be corrected.
- **The spreadsheet** must never be committed. The import reads it from a path you pass in.

## Identity and duplicates

- **CSV row numbers are not stable IDs.** Sorting the sheet or inserting a row changes every row number after it, so re-importing by row would attach data to the wrong person. The import matches on `importKey` instead.
- **Repeated names are flagged, not merged.** Four first-and-last-name pairs appear twice. They may be two brothers with the same name, so the import sets `possibleDuplicate` and keeps both.
- **Repeated emails merge.** One email appears on two rows. Those rows share an `importKey`, so the second row updates the first.

## Sample records (fictional)

Populated:

```json
{
  "name": "Jordan Example",
  "industry": "Consulting",
  "company": "Example Partners",
  "position": "Senior Consultant",
  "classLabel": "Class of 2019",
  "major": "Industrial Engineering",
  "location": "Atlanta, GA",
  "linkedin": "https://www.linkedin.com/in/jordan-example",
  "chapterRoles": "VP of Professional Development (2017 - 2018)",
  "hasContact": true
}
```

Sparse, name and pledge class only:

```json
{
  "name": "Casey Sample",
  "industry": null,
  "company": null,
  "position": null,
  "classLabel": "Pledged Fall 1984",
  "major": null,
  "location": null,
  "linkedin": null,
  "chapterRoles": null,
  "hasContact": false
}
```

## Importing

```bash
cd backend
npm run alumni:import -- /path/to/alumni.csv --dry-run
npm run alumni:import -- /path/to/alumni.csv
```

The dry run prints counts only and writes nothing. The import is safe to run again: it updates existing alumni and adds new ones.

## Known data gaps

- **89 LinkedIn cells** contain the word "LinkedIn" with the hyperlink lost on export, and no URL in the helper column. Exporting the sheet as `.xlsx`, or adding a column that extracts each hyperlink's URL, would recover them.
- **Two pledge class values** are not dates or terms and are skipped.
- **Graduation year exists for only 357 rows.** Pledge class covers 1,165 rows and is the main source for era.

## Decisions for the chapter

1. **Contact access:** should all members see alumni email and phone, or only officers? The current default is officers only.
2. **Deceased alumni:** hide them entirely, as now, or show them on an "In memoriam" list?
3. **Source of truth:** once the app has the data, is the spreadsheet still edited and re-imported, or do officers edit alumni in the app?
4. **Opt-out:** how does an alum ask to be removed or to hide their details?
5. **Duplicate names:** who confirms whether the four repeated names are the same person?
