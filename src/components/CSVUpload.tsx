import { useState } from 'react';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';
import { db } from '../lib/db';
import { parseMARC034 } from '../utils/marcParser';

interface CSVRow {
  [key: string]: string;
}

interface UploadResult {
  success: number;
  failed: number;
  errors: string[];
}

interface CSVUploadProps {
  onUploadComplete: () => void;
}

export function CSVUpload({ onUploadComplete }: CSVUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = async (file: File) => {
    if (!file) return;

    setUploading(true);
    setResult(null);

    Papa.parse<CSVRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const uploadResult: UploadResult = {
          success: 0,
          failed: 0,
          errors: [],
        };

        // Snapshot existing records so previously-adjusted bboxes survive re-import
        const existingRecords = await db.getAllRecords();
        const existingMap = new Map(existingRecords.map(r => [r.id, r]));

        for (const row of results.data) {
          try {
            const idKey = Object.keys(row).find(key => key.toLowerCase() === 'ckey/hrid');
            const titleKey = Object.keys(row).find(key => key.toLowerCase() === 'title');
            const bboxKey = Object.keys(row).find(key => key === '034' || key === '34');

            if (!idKey || !bboxKey) {
              uploadResult.failed++;
              uploadResult.errors.push(`Row missing required fields (ckey/hrid, 034): ${JSON.stringify(row)}`);
              continue;
            }

            const id = row[idKey];
            const title = titleKey ? row[titleKey] : '';
            const bboxValue = row[bboxKey]?.trim() ?? '';

            // Silently skip blank/filler rows with no ID
            if (!id) continue;

            // Skip rows with no coordinates — expected for some catalog records
            if (!bboxValue || bboxValue.toLowerCase() === 'n/a') {
              continue;
            }

            const bbox = parseMARC034(bboxValue);
            if (!bbox) {
              uploadResult.failed++;
              uploadResult.errors.push(`Failed to parse 255 field for ${id}: ${bboxValue}`);
              continue;
            }

            const extraColumns: Record<string, string> = {};
            for (const key in row) {
              if (
                key.toLowerCase() !== 'ckey/hrid' &&
                key.toLowerCase() !== 'title' &&
                key !== '034' && key !== '34' &&
                key.toLowerCase() !== '255'
              ) {
                extraColumns[key] = row[key];
              }
            }

            const existing = existingMap.get(id);
            await db.addRecord({
              id,
              title,
              // Preserve adjusted bbox coordinates; only accept CSV values for new/unadjusted records
              bbox: existing?.adjusted ? existing.bbox : bboxValue,
              west_long: existing?.adjusted ? existing.west_long : bbox.west,
              east_long: existing?.adjusted ? existing.east_long : bbox.east,
              north_lat: existing?.adjusted ? existing.north_lat : bbox.north,
              south_lat: existing?.adjusted ? existing.south_lat : bbox.south,
              adjusted: existing?.adjusted ?? false,
              created_at: existing?.created_at ?? new Date().toISOString(),
              updated_at: new Date().toISOString(),
              extraColumns,
            });

            uploadResult.success++;
          } catch (error) {
            uploadResult.failed++;
            uploadResult.errors.push(`Error processing row: ${error}`);
          }
        }

        setResult(uploadResult);
        setUploading(false);
        if (uploadResult.success > 0) {
          onUploadComplete();
        }
      },
      error: (error) => {
        setResult({
          success: 0,
          failed: 1,
          errors: [`CSV parsing error: ${error.message}`],
        });
        setUploading(false);
      },
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await processFile(file);
    }
    event.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'text/csv') {
      await processFile(file);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Import Map Records</h2>

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={uploading}
          className="hidden"
          id="csv-upload"
        />
        <label
          htmlFor="csv-upload"
          className={`cursor-pointer ${uploading ? 'opacity-50' : ''}`}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <p className="text-sm font-medium text-gray-700 mb-1">
            {uploading ? 'Uploading...' : isDragging ? 'Drop CSV file here' : 'Click to upload or drag & drop CSV file'}
          </p>
          <p className="text-xs text-gray-500">
            Required columns: ckey/hrid, 034 — title is optional, all other columns preserved
          </p>
        </label>
      </div>

      {result && (
        <div className="mt-4 space-y-2">
          {result.success > 0 && (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-medium">
                Successfully imported {result.success} record{result.success !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          {result.failed > 0 && (
            <div className="bg-red-50 p-3 rounded">
              <div className="flex items-center gap-2 text-red-700 mb-2">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm font-medium">
                  Failed to import {result.failed} record{result.failed !== 1 ? 's' : ''}
                </span>
              </div>
              {result.errors.length > 0 && (
                <div className="text-xs text-red-600 max-h-32 overflow-y-auto space-y-1 ml-7">
                  {result.errors.slice(0, 5).map((error, i) => (
                    <div key={i}>{error}</div>
                  ))}
                  {result.errors.length > 5 && (
                    <div className="font-medium">
                      ...and {result.errors.length - 5} more errors
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
