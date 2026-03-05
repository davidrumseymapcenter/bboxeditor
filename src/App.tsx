// React hooks for managing component state and side effects
import { useState, useEffect } from 'react';
// Icons for UI elements (map icon in header, download icon on button)
import { Map as MapIcon, Download, Trash2 } from 'lucide-react';
// CSV parsing library for converting data to CSV format on download
import Papa from 'papaparse';
// Database module for reading and updating records in storage
import { db, MapRecord } from './lib/db';
import { generateMARC034, generateMARC255 } from './utils/marcParser';
// Component for CSV file upload with drag-and-drop functionality
import { CSVUpload } from './components/CSVUpload';
// Component for displaying interactive map with bounding box overlay
import { MapViewer } from './components/MapViewer';
// Component for displaying scrollable list of map records
import { RecordList } from './components/RecordList';

function App() {
  const [records, setRecords] = useState<MapRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const selectedRecord = records.find(r => r.id === selectedId);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadRecords(); }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const data = await db.getAllRecords();
      setRecords(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading records:', error);
    }
    setLoading(false);
  };

  const handleSave = async (
    id: string,
    bounds: { west: number; east: number; north: number; south: number }
  ) => {
    try {
      const record = records.find(r => r.id === id);
      if (!record) {
        alert('Record not found');
        return;
      }

      const updatedBbox = generateMARC034(bounds);

      await db.updateRecord({
        ...record,
        bbox: updatedBbox,
        west_long: bounds.west,
        east_long: bounds.east,
        north_lat: bounds.north,
        south_lat: bounds.south,
        adjusted: true,
        updated_at: new Date().toISOString(),
      });

      await loadRecords();
      alert('Changes saved successfully');
    } catch (error) {
      console.error('Error saving record:', error);
      alert('Failed to save changes');
    }
  };

  const handleClearAll = async () => {
    if (!confirm(`Clear all ${records.length} records? This cannot be undone.`)) return;
    await db.clearAllRecords();
    setRecords([]);
    setSelectedId(null);
  };

  const handleDownloadCSV = () => {
    const csvData = records.map(record => {
      const bounds = {
        west: record.west_long,
        east: record.east_long,
        north: record.north_lat,
        south: record.south_lat,
      };

      return {
        'ckey/hrid': record.id,
        ...(record.title ? { title: record.title } : {}),
        '034': record.adjusted ? generateMARC034(bounds) : record.bbox,
        '255': generateMARC255(bounds),
        ...record.extraColumns,
      };
    });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `map_records_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MapIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Map Bounding Box Editor
                </h1>
                <p className="text-sm text-gray-600">
                  Verify and adjust MARC 034 bounding box metadata
                </p>
              </div>
            </div>
            {records.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <Download className="h-4 w-4" />
                  Download CSV
                </button>
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex flex-col px-6 py-6 min-h-0">
        <div className="flex-shrink-0 mb-4">
          <CSVUpload onUploadComplete={loadRecords} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center flex-1">
            <div className="text-gray-500">Loading records...</div>
          </div>
        ) : records.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <MapIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No map records yet
            </h3>
            <p className="text-gray-600">
              Upload a CSV file to start verifying bounding boxes
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 min-h-0 h-full">
              <RecordList
                records={records}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>
            <div className="lg:col-span-2 min-h-0 h-full">
              {selectedRecord ? (
                <MapViewer key={selectedRecord.id} record={selectedRecord} onSave={handleSave} />
              ) : (
                <div className="bg-white rounded-lg shadow-sm h-full flex items-center justify-center">
                  <p className="text-gray-500">Select a record to view</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
