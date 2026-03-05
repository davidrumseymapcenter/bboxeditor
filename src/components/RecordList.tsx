import { useState, useEffect } from 'react';
import { Search, MapPin, CheckCircle } from 'lucide-react';

interface MapRecord {
  id: string;
  title: string;
  bbox: string;
  west_long: number;
  east_long: number;
  north_lat: number;
  south_lat: number;
  adjusted: boolean;
  extraColumns: Record<string, string>;
}

interface RecordListProps {
  records: MapRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function RecordList({ records, selectedId, onSelect }: RecordListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRecords, setFilteredRecords] = useState(records);

  useEffect(() => {
    const filtered = records.filter(
      (record) =>
        record.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredRecords(filtered);
  }, [searchTerm, records]);

  return (
    <div className="bg-white rounded-lg shadow-sm flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">Map Records</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by ckey/hrid or title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
        <div className="mt-2 text-xs text-gray-600">
          {filteredRecords.length} of {records.length} records
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No records found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredRecords.map((record) => (
              <button
                key={record.id}
                onClick={() => onSelect(record.id)}
                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                  selectedId === record.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {record.title && (
                      <div className="font-medium text-gray-900 truncate">{record.title}</div>
                    )}
                    <div className={`truncate ${record.title ? 'text-sm text-gray-600 mt-1' : 'font-medium text-gray-900'}`}>
                      {record.id}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 font-mono">
                      {record.north_lat.toFixed(2)}°N, {record.west_long.toFixed(2)}°W
                    </div>
                  </div>
                  {record.adjusted && (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
