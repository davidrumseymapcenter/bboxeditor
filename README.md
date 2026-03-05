# Map Bounding Box Editor

A web application for verifying and adjusting MARC 034 bounding box metadata for map records. This tool allows librarians and archivists to upload CSV files containing map metadata, visualize bounding boxes on an interactive map, and make precise adjustments to geographic coordinates.

## Features

- **Flexible CSV Upload**: Upload any spreadsheet containing `ckey/hrid` and `255` columns
- **Data Preservation**: All extra columns in your CSV are automatically preserved through editing and export
- **Interactive Map Visualization**: View bounding boxes on an OpenStreetMap base layer
- **Drag-to-Adjust**: Modify bounding box corners by dragging markers on the map
- **MARC 034 Format Support**: Parses and generates MARC 034 coordinate strings
- **Real-time Coordinate Display**: View decimal degree coordinates as you adjust
- **Search Functionality**: Filter records by ckey/hrid or title
- **Export to CSV**: Download edited records with updated bbox values in MARC format
- **Local Storage**: All data is stored in your browser using IndexedDB (no server required)

## How It Works

### Input Format
Your CSV file must contain these columns (case-insensitive):

- `ckey/hrid`: Unique identifier for each map record (required)
- `255`: Bounding box coordinates in MARC 034 format (required)
- `title`: Descriptive title of the map (optional)

Example MARC 034 bbox format:
```
$$dW1234567$$eW0987654$$fN0456789$$gN0123456
```

Where:
- `$$d` = West longitude
- `$$e` = East longitude
- `$$f` = North latitude
- `$$g` = South latitude

Coordinates use the format: `[Hemisphere][DDDMMSS]`
- Hemisphere: N/S for latitude, E/W for longitude
- DDD: Degrees (3 digits)
- MM: Minutes (2 digits)
- SS: Seconds (2 digits)

### Workflow
1. **Upload**: Drag and drop or select a CSV file
2. **Review**: Browse through your map records in the left panel
3. **Visualize**: Select a record to see its bounding box on the map
4. **Adjust**: Drag the corner markers to modify the bounding box
5. **Save**: Click "Save Changes" to update the record
6. **Export**: Download all records as a CSV with updated coordinates

## Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Setup

1. Clone or download the project:
```bash
git clone <repository-url>
cd <project-directory>
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

## Usage

### Uploading Data
1. Click the upload area or drag a CSV file onto it
2. The app will validate and parse your data
3. Successfully imported records appear in the left panel
4. Any errors are displayed with details

### Editing Bounding Boxes
1. Select a record from the list (left panel)
2. The map displays the current bounding box with four draggable corner markers:
   - NW (Northwest)
   - NE (Northeast)
   - SW (Southwest)
   - SE (Southeast)
3. Drag any corner to adjust the bounding box
4. Coordinates update in real-time
5. Click "Save Changes" to persist your edits
6. Click "Reset" to revert to the original coordinates

### Exporting Data
1. Click "Download CSV" in the header
2. The exported file includes:
   - Original column order preserved
   - Updated bbox values for adjusted records
   - Original bbox values for unchanged records
   - All extra columns from your original file

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── CSVUpload.tsx       # File upload with drag-and-drop
│   │   ├── MapViewer.tsx       # Interactive map with bounding box
│   │   └── RecordList.tsx      # Searchable list of records
│   ├── lib/
│   │   └── db.ts               # IndexedDB database manager
│   ├── utils/
│   │   └── marcParser.ts       # MARC 034 coordinate parser
│   ├── App.tsx                 # Main application component
│   ├── main.tsx                # Application entry point
│   └── index.css               # Global styles (Tailwind)
├── public/                     # Static assets
├── package.json                # Dependencies and scripts
├── vite.config.ts              # Vite configuration
└── tsconfig.json               # TypeScript configuration
```

## Technical Details

### Tech Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Mapping**: Leaflet
- **CSV Parsing**: PapaParse
- **Storage**: IndexedDB (browser-based)
- **Icons**: Lucide React

### Key Components

#### CSVUpload
- Handles file upload via click or drag-and-drop
- Validates required columns (ID, title, bbox)
- Parses MARC 034 coordinates
- Extracts and preserves extra columns
- Stores records in IndexedDB

#### MapViewer
- Renders interactive map using Leaflet
- Displays bounding box as a rectangle overlay
- Provides draggable corner markers
- Updates coordinates in real-time
- Handles save/reset operations

#### RecordList
- Displays all imported records
- Provides search by ID or title
- Shows adjusted status with visual indicator
- Highlights selected record

### Data Storage
Records are stored locally in your browser using IndexedDB:
- Database: `MapRecordsDB`
- Store: `records`
- Key: `id` field
- Schema includes all original columns plus parsed coordinates

### Coordinate Conversion
The app converts between two formats:

**MARC 034 Format** (storage/export):
```
$$dW1234567$$eE0123456$$fN0456789$$gS0123456
```

**Decimal Degrees** (internal/display):
```
west: -123.767194
east: 12.582222
north: 45.797778
south: -12.393333
```

## Exporting to Local Machine

### Method 1: Download from Bolt
1. In Bolt, click the menu icon (three dots) in the top-right
2. Select "Download as ZIP"
3. Extract the ZIP file on your local machine
4. Navigate to the extracted folder

### Method 2: Clone with Git (if connected to GitHub)
```bash
git clone <your-repo-url>
cd <project-name>
```

### Set Up Local Environment
1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the project root (if needed):
```env
VITE_SUPABASE_URL=https://eodmykvlqpvdkqaurgrb.supabase.co
VITE_SUPABASE_ANON_KEY=your-key-here
```

3. Run the development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Bringing Project Back to Bolt

### Method 1: Upload ZIP
1. Create a ZIP file of your entire project folder
2. Go to Bolt (bolt.new)
3. Click "Import Project"
4. Upload your ZIP file
5. Bolt will restore the project with all your changes

### Method 2: Push to GitHub and Import
1. Initialize git (if not already done):
```bash
git init
git add .
git commit -m "Initial commit"
```

2. Create a new GitHub repository

3. Push your code:
```bash
git remote add origin <your-github-repo-url>
git branch -M main
git push -u origin main
```

4. In Bolt, click "Import from GitHub"
5. Select your repository

### Method 3: Manual File Upload
1. In Bolt, create a new project
2. Manually upload changed files through the Bolt interface
3. Bolt will preserve the directory structure

### Important Notes
- The `.env` file is already configured in Bolt with Supabase credentials
- IndexedDB data (uploaded records) stays in your browser and won't transfer
- You'll need to re-upload your CSV files in any new environment
- All dependencies will automatically reinstall when imported to Bolt

## Development Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run ESLint
npm run lint

# Type check
npm run typecheck
```

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Supported with responsive design

## Data Privacy

All data is stored locally in your browser using IndexedDB. No data is sent to external servers. Your CSV files and edits remain completely private.

## Troubleshooting

### Upload Fails
- Ensure your CSV has `ID`, `title`, and `bbox` columns
- Check that bbox values are in MARC 034 format
- Verify the CSV is properly formatted (no missing commas)

### Map Not Displaying
- Check browser console for errors
- Ensure you have an internet connection (for map tiles)
- Try refreshing the page

### Records Not Saving
- Check browser console for IndexedDB errors
- Ensure you're not in private/incognito mode (may restrict storage)
- Try clearing browser cache and reloading

### Export Missing Columns
- Verify columns were present in the original upload
- Check that column names don't conflict with reserved fields

## Future Enhancements

Potential features for future development:
- Batch editing capabilities
- Multiple bounding box format support
- Historical map overlay support
- Coordinate system transformations
- Undo/redo functionality
- Cloud storage integration
- Collaborative editing

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]

## Support

For questions or issues, please [add contact information or issue tracker link].
