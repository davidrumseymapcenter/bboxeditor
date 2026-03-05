# Map Bounding Box Editor

> 🤖 **AI-Generated Code**: This repository was created with the help of Claude by Anthropic. While the code has been reviewed, it may contain errors or limitations. Use at your own discretion.

A web application for verifying and adjusting MARC 034 bounding box metadata for map records. Upload a CSV containing map catalog records, visualize each bounding box on an interactive map, drag corners to correct coordinates, and export updated MARC 034 and MARC 255 fields.

## Features

- **CSV Upload**: Drag-and-drop or click to upload; all columns beyond the required ones are preserved through editing and export
- **Multiple MARC 034 Format Support**: Parses subfield (`$$d`/`$$e`/`$$f`/`$$g`), MARC 255 `$c`, bounding polygon (`$$f` vertex list), and G-polygon (`$$t`/`$$s`) formats
- **Interactive Map**: View bounding boxes on an OpenStreetMap base layer, automatically zoomed to fit each record
- **Drag-to-Adjust**: Move corner markers to correct bounding box coordinates
- **Dual MARC Export**: Exports updated `034` (subfield format) and a generated `255` (`$c` coordinate statement) for adjusted records
- **Adjustment Persistence**: Previously-adjusted records are preserved when re-importing the source CSV
- **Search**: Filter the record list by ckey/hrid or title
- **Local-only**: All data lives in your browser via IndexedDB — nothing is sent to a server

## CSV Format

Your CSV must contain these columns (column names are case-sensitive for `034`/`34`):

| Column | Required | Notes |
|--------|----------|-------|
| `ckey/hrid` | Yes (case-insensitive) | Unique record identifier |
| `034` or `34` | Yes | MARC 034 bounding box coordinates |
| `title` | No | Record title; shown in the list if present |

All other columns are preserved as-is in the export.

Rows with a blank `ckey/hrid` or a blank/`N/A` `034` value are silently skipped.

### Supported MARC 034 Input Formats

**Subfield format** (most common):

```
$$dW1224800$$eW1214300$$fN0375900$$gN0370400
```

**MARC 255 `$c` coordinate statement**:

```
$c(W 178°26'00"--W 154°45'00"/N 28°31'00"--N 18°51'00")
```

**Bounding polygon** (`$$f` vertex list, semicolon-separated):

```
$$f W 122°13'00"/N 37°04'00" ; W 122°48'00"/N 37°42'00" ; W 122°19'00"/N 37°59'00" ; W 121°43'00"/N 37°21'00"
```

**G-polygon** (`$$t`/`$$s` subfields):

```
$$tW1221300$$sN0370400$$tW1224800$$sN0374200$$tW1221900$$sN0375900
```

## Workflow

1. **Upload** — drag and drop or select a CSV file
2. **Review** — browse records in the left panel; records show an "Adjusted" badge once edited
3. **Visualize** — select a record to display its bounding box on the map (map zooms to fit)
4. **Adjust** — drag the NW, NE, SW, SE corner markers to correct the bounding box
5. **Save** — click "Save Changes" to persist edits; click "Reset" to revert
6. **Export** — click "Download CSV" to get all records with updated `034` and `255` values

### Export format

For each record, the export writes:

- `034` — original value for unadjusted records; freshly generated `$$d`/`$$e`/`$$f`/`$$g` for adjusted records
- `255` — generated `$c` coordinate statement derived from current coordinates (e.g. `$c(W 122°48'00"--W 121°43'00"/N 37°59'00"--N 37°04'00")`)
- All other original columns — unchanged

Re-importing the exported CSV (or the original source CSV) will not overwrite records that have already been adjusted.

## Development

### Prerequisites

Node.js v18 or higher.

### Setup

```bash
git clone <repository-url>
cd bboxEditor
npm install
npm run dev        # http://localhost:5173
```

### Scripts

```bash
npm run dev          # Development server
npm run build        # Production build (output: dist/)
npm run preview      # Preview production build locally
npm run typecheck    # TypeScript type check
npm run lint         # ESLint
npm run test         # Run unit tests (Vitest)
npm run test:watch   # Run tests in watch mode
```

### Deployment

The project deploys automatically to GitHub Pages via GitHub Actions on every push to `main`. See [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

To deploy manually:

```bash
npm run build
# then serve the dist/ folder from your static host of choice
```

## Project Structure

```
src/
├── components/
│   ├── CSVUpload.tsx       # File upload with drag-and-drop, parse & store
│   ├── MapViewer.tsx       # Leaflet map with draggable bounding box
│   └── RecordList.tsx      # Searchable, scrollable record list
├── lib/
│   └── db.ts               # IndexedDB database manager
├── utils/
│   ├── marcParser.ts       # MARC coordinate parser + 034/255 generators
│   └── marcParser.test.ts  # Parser unit tests
├── App.tsx                 # Main application layout and state
├── main.tsx                # Entry point
└── index.css               # Tailwind global styles
```

## Tech Stack

- **React 18** with TypeScript
- **Vite** build tool
- **Tailwind CSS**
- **Leaflet** interactive maps
- **PapaParse** CSV parsing
- **IndexedDB** browser-local storage
- **Vitest** unit testing

## Troubleshooting

### Upload fails / records not imported

- Ensure the CSV has `ckey/hrid` and `034` (or `34`) columns
- Check that `034` values are in a recognized MARC format (see above)
- Rows with no ID or no coordinates are silently skipped — verify the source data

### Map tiles not showing

- The app requires an internet connection for OpenStreetMap tiles
- Check browser console for errors

### Records not saving

- IndexedDB may be restricted in private/incognito mode
- Check the browser console for storage errors

## Data Privacy

All data is stored locally in your browser (IndexedDB). Nothing is sent to any external server. Your CSV files and edits remain entirely private.

## Contributing

Open a pull request or submit an issue with comments and suggestions.
