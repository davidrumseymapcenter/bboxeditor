export interface BoundingBox {
  west: number;
  east: number;
  north: number;
  south: number;
}

export function parseMARC034(marc034Field: string): BoundingBox | null {
  // Try $d/$e/$f/$g subfield format first
  const subfieldResult = parseSubfields(marc034Field);
  if (subfieldResult) return subfieldResult;

  // Try $c(...) MARC 255 format
  const coordStringResult = parseCoordString(marc034Field);
  if (coordStringResult) return coordStringResult;

  // Try bounding polygon format: $$f LON/LAT ; LON/LAT ; ...
  const polygonResult = parsePolygon(marc034Field);
  if (polygonResult) return polygonResult;

  // Try MARC 034 G-polygon: $$tW1222420$$sN0374759...
  return parseGPolygon(marc034Field);
}

function parseSubfields(field: string): BoundingBox | null {
  try {
    const westMatch = field.match(/\$d([^$]+)/);
    const eastMatch = field.match(/\$e([^$]+)/);
    const northMatch = field.match(/\$f([^$]+)/);
    const southMatch = field.match(/\$g([^$]+)/);

    if (!westMatch || !eastMatch || !northMatch || !southMatch) {
      return null;
    }

    const west = parseCoordinate(westMatch[1].trim());
    const east = parseCoordinate(eastMatch[1].trim());
    const north = parseCoordinate(northMatch[1].trim());
    const south = parseCoordinate(southMatch[1].trim());

    if (west === null || east === null || north === null || south === null) {
      return null;
    }

    return { west, east, north, south };
  } catch (error) {
    console.error('Error parsing MARC 034 subfields:', error);
    return null;
  }
}

// Parses MARC 255 $c format:
// $c(W 180°00'00"--E 180°00'00"/N 84°59'00"--S 85°00'00")
function parseCoordString(field: string): BoundingBox | null {
  try {
    const cMatch = field.match(/\$c\(([^)]+)\)/);
    if (!cMatch) return null;

    const content = cMatch[1];
    const slashIdx = content.indexOf('/');
    if (slashIdx === -1) return null;

    const longPart = content.substring(0, slashIdx);
    const latPart = content.substring(slashIdx + 1);

    const longCoords = longPart.split('--');
    const latCoords = latPart.split('--');

    if (longCoords.length !== 2 || latCoords.length !== 2) return null;

    const west = parseDMS(longCoords[0].trim());
    const east = parseDMS(longCoords[1].trim());
    const north = parseDMS(latCoords[0].trim());
    const south = parseDMS(latCoords[1].trim());

    if (west === null || east === null || north === null || south === null) {
      return null;
    }

    return { west, east, north, south };
  } catch {
    return null;
  }
}

// Parses "W 180°00'00"" or "N 84°59'00"" style coordinates
function parseDMS(coord: string): number | null {
  const match = coord.match(/([WENS])\s*(\d+)°(\d+)'(\d+)"/);
  if (!match) return null;

  const hemisphere = match[1];
  const degrees = parseInt(match[2], 10);
  const minutes = parseInt(match[3], 10);
  const seconds = parseInt(match[4], 10);

  let decimal = degrees + minutes / 60 + seconds / 3600;
  if (hemisphere === 'W' || hemisphere === 'S') {
    decimal = -decimal;
  }
  return decimal;
}

// Parses bounding polygon format: $$f E 286°01'42"/N 40°45'48" ; E 286°01'00"/N 40°46'05" ; ...
// Computes a bounding box from the min/max of the vertex coordinates.
// Longitudes in 0–360 range (e.g. E 286°) are normalized to −180/+180.
function parsePolygon(field: string): BoundingBox | null {
  try {
    const fMatch = field.match(/\$f\s*(.+)/);
    if (!fMatch) return null;

    const vertices = fMatch[1].split(/\s*;\s*/);
    if (vertices.length < 3) return null;

    const lons: number[] = [];
    const lats: number[] = [];

    for (const vertex of vertices) {
      const slashIdx = vertex.indexOf('/');
      if (slashIdx === -1) return null;

      const lonRaw = parseDMS(vertex.substring(0, slashIdx).trim());
      const latRaw = parseDMS(vertex.substring(slashIdx + 1).trim());
      if (lonRaw === null || latRaw === null) return null;

      // Normalize 0–360 east-only longitudes to −180/+180
      lons.push(lonRaw > 180 ? lonRaw - 360 : lonRaw);
      lats.push(latRaw);
    }

    return {
      west: Math.min(...lons),
      east: Math.max(...lons),
      north: Math.max(...lats),
      south: Math.min(...lats),
    };
  } catch {
    return null;
  }
}

// Parses MARC 034 G-polygon subfield format: $$tW1222420$$sN0374759$$tW1222424$$sN0374803...
// $t = G-polygon longitude, $s = G-polygon latitude, 7-digit DDDMMSS with hemisphere prefix.
function parseGPolygon(field: string): BoundingBox | null {
  try {
    const lonMatches = [...field.matchAll(/\$t([^$]+)/g)];
    const latMatches = [...field.matchAll(/\$s([^$]+)/g)];

    if (lonMatches.length < 3 || latMatches.length !== lonMatches.length) return null;

    const lons: number[] = [];
    const lats: number[] = [];

    for (const m of lonMatches) {
      const lon = parseCoordinate(m[1].trim());
      if (lon === null) return null;
      lons.push(lon);
    }

    for (const m of latMatches) {
      const lat = parseCoordinate(m[1].trim());
      if (lat === null) return null;
      lats.push(lat);
    }

    return {
      west: Math.min(...lons),
      east: Math.max(...lons),
      north: Math.max(...lats),
      south: Math.min(...lats),
    };
  } catch {
    return null;
  }
}

// --- Coordinate generation (decimal degrees → MARC output) ---

function toDMS(value: number): [number, number, number] {
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const minDec = (abs - deg) * 60;
  const min = Math.floor(minDec);
  const sec = Math.floor((minDec - min) * 60);
  return [deg, min, sec];
}

/** Returns the 7-char DDDMMSS code used in MARC 034 subfields, e.g. W1800000. */
function dmsCode(value: number, isLongitude: boolean): string {
  const h = isLongitude ? (value >= 0 ? 'E' : 'W') : (value >= 0 ? 'N' : 'S');
  const [deg, min, sec] = toDMS(value);
  return `${h}${deg.toString().padStart(3, '0')}${min.toString().padStart(2, '0')}${sec.toString().padStart(2, '0')}`;
}

/** Returns the human-readable DMS label used in MARC 255 $c, e.g. W 180°00'00". */
function dmsLabel(value: number, isLongitude: boolean): string {
  const h = isLongitude ? (value >= 0 ? 'E' : 'W') : (value >= 0 ? 'N' : 'S');
  const [deg, min, sec] = toDMS(value);
  return `${h} ${deg}°${min.toString().padStart(2, '0')}'${sec.toString().padStart(2, '0')}"`;
}

/**
 * Generates a MARC 034 bounding box string from decimal-degree coordinates.
 * Example: $$dW1800000$$eE1800000$$fN0845900$$gS0850000
 */
export function generateMARC034(bounds: BoundingBox): string {
  return `$$d${dmsCode(bounds.west, true)}$$e${dmsCode(bounds.east, true)}$$f${dmsCode(bounds.north, false)}$$g${dmsCode(bounds.south, false)}`;
}

/**
 * Generates a MARC 255 $c coordinate statement from decimal-degree coordinates.
 * Example: $c(W 180°00'00"--E 180°00'00"/N 84°59'00"--S 85°00'00")
 */
export function generateMARC255(bounds: BoundingBox): string {
  return `$c(${dmsLabel(bounds.west, true)}--${dmsLabel(bounds.east, true)}/${dmsLabel(bounds.north, false)}--${dmsLabel(bounds.south, false)})`;
}

function parseCoordinate(coord: string): number | null {
  try {
    coord = coord.trim();

    let hemisphere = '';
    let value = coord;

    if (coord.startsWith('E') || coord.startsWith('W') ||
        coord.startsWith('N') || coord.startsWith('S')) {
      hemisphere = coord[0];
      value = coord.slice(1);
    }

    value = value.replace(/[^\d]/g, '');

    if (value.length === 7) {
      const degrees = parseInt(value.substring(0, 3), 10);
      const minutes = parseInt(value.substring(3, 5), 10);
      const seconds = parseInt(value.substring(5, 7), 10);

      let decimal = degrees + (minutes / 60) + (seconds / 3600);

      if (hemisphere === 'W' || hemisphere === 'S') {
        decimal = -decimal;
      }

      return decimal;
    }

    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      if (hemisphere === 'W' || hemisphere === 'S') {
        return -parsed;
      }
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}
