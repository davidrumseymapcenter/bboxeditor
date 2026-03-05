import { describe, it, expect } from 'vitest';
import { parseMARC034 } from './marcParser';

describe('parseMARC034', () => {
  describe('valid inputs', () => {
    it('parses all-positive bounds (N/E)', () => {
      // N045°00'00" = 45.0, E012°30'00" = 12.5, N045°00'00" = 45.0, N010°00'00" = 10.0
      const result = parseMARC034('$$dE0123000$$eE0451200$$fN0450000$$gN0100000');
      expect(result).not.toBeNull();
      expect(result!.west).toBeCloseTo(12.5, 4);
      expect(result!.east).toBeCloseTo(45.2, 4);
      expect(result!.north).toBeCloseTo(45.0, 4);
      expect(result!.south).toBeCloseTo(10.0, 4);
    });

    it('parses negative (W/S) coordinates', () => {
      // W100°00'00" = -100.0, W010°00'00" = -10.0, S045°00'00" = -45.0, S010°00'00" = -10.0
      const result = parseMARC034('$$dW1000000$$eW0100000$$fS0450000$$gS0100000');
      expect(result).not.toBeNull();
      expect(result!.west).toBeCloseTo(-100.0, 4);
      expect(result!.east).toBeCloseTo(-10.0, 4);
      expect(result!.north).toBeCloseTo(-45.0, 4);
      expect(result!.south).toBeCloseTo(-10.0, 4);
    });

    it('parses cross-hemisphere bounds (W/E, N/S)', () => {
      // $$d=W, $$e=E, $$f=N, $$g=S — typical world map slice
      const result = parseMARC034('$$dW0100000$$eE0100000$$fN0300000$$gS0300000');
      expect(result).not.toBeNull();
      expect(result!.west).toBeCloseTo(-10.0, 4);
      expect(result!.east).toBeCloseTo(10.0, 4);
      expect(result!.north).toBeCloseTo(30.0, 4);
      expect(result!.south).toBeCloseTo(-30.0, 4);
    });

    it('converts degrees, minutes, seconds to decimal degrees correctly', () => {
      // W001°30'00" = -(1 + 30/60) = -1.5
      const result = parseMARC034('$$dW0013000$$eE0000000$$fN0000000$$gS0000000');
      expect(result).not.toBeNull();
      expect(result!.west).toBeCloseTo(-1.5, 5);
    });

    it('converts seconds to decimal correctly', () => {
      // N000°00'36" = 36/3600 = 0.01
      const result = parseMARC034('$$dE0000000$$eE0000000$$fN0000036$$gS0000000');
      expect(result).not.toBeNull();
      expect(result!.north).toBeCloseTo(0.01, 5);
    });

    it('handles single $ prefix as well as $$ prefix', () => {
      // The regex matches $d so both $d and $$d work
      const result = parseMARC034('$dW0100000$eE0100000$fN0300000$gS0300000');
      expect(result).not.toBeNull();
      expect(result!.west).toBeCloseTo(-10.0, 4);
    });

    it('parses the README example format', () => {
      const result = parseMARC034('$$dW1234567$$eW0987654$$fN0456789$$gN0123456');
      expect(result).not.toBeNull();
      // W1234567 = -(123 + 45/60 + 67/3600) — seconds > 60 but parser doesn't validate
      expect(result!.west).toBeLessThan(0);
      expect(result!.east).toBeLessThan(0);
      expect(result!.north).toBeGreaterThan(0);
      expect(result!.south).toBeGreaterThan(0);
    });
  });

  describe('invalid / missing inputs', () => {
    it('returns null when $$d is missing', () => {
      expect(parseMARC034('$$eE0100000$$fN0300000$$gS0300000')).toBeNull();
    });

    it('returns null when $$e is missing', () => {
      expect(parseMARC034('$$dW0100000$$fN0300000$$gS0300000')).toBeNull();
    });

    it('returns null when $$f is missing', () => {
      expect(parseMARC034('$$dW0100000$$eE0100000$$gS0300000')).toBeNull();
    });

    it('returns null when $$g is missing', () => {
      expect(parseMARC034('$$dW0100000$$eE0100000$$fN0300000')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseMARC034('')).toBeNull();
    });

    it('returns null for completely invalid input', () => {
      expect(parseMARC034('not a marc field')).toBeNull();
    });
  });

  describe('MARC 255 $c(...) format', () => {
    it('parses N/S and E/W bounds', () => {
      const result = parseMARC034('$c(W 180°00\'00"--E 180°00\'00"/N 84°59\'00"--S 85°00\'00")');
      expect(result).not.toBeNull();
      expect(result!.west).toBeCloseTo(-180.0, 4);
      expect(result!.east).toBeCloseTo(180.0, 4);
      expect(result!.north).toBeCloseTo(84.9833, 3);
      expect(result!.south).toBeCloseTo(-85.0, 4);
    });

    it('parses all-W longitude bounds', () => {
      const result = parseMARC034('$c(W 178°26\'00"--W 154°45\'00"/N 28°31\'00"--N 18°51\'00")');
      expect(result).not.toBeNull();
      expect(result!.west).toBeCloseTo(-178.4333, 3);
      expect(result!.east).toBeCloseTo(-154.75, 3);
      expect(result!.north).toBeCloseTo(28.5167, 3);
      expect(result!.south).toBeCloseTo(18.85, 3);
    });

    it('parses antimeridian-crossing bounds (E west, W east)', () => {
      const result = parseMARC034('$c(E 144°24\'00"--W 64°21\'00"/N 71°36\'00"--S 14°45\'00")');
      expect(result).not.toBeNull();
      expect(result!.west).toBeCloseTo(144.4, 3);
      expect(result!.east).toBeCloseTo(-64.35, 3);
      expect(result!.north).toBeCloseTo(71.6, 3);
      expect(result!.south).toBeCloseTo(-14.75, 3);
    });

    it('returns null for N/A', () => {
      expect(parseMARC034('N/A')).toBeNull();
    });
  });

  describe('bounding polygon format ($$f with vertex list)', () => {
    it('computes bbox from standard W/N polygon', () => {
      const input = '$$f W 122°13\'00"/N 37°04\'00" ; W 122°48\'00"/N 37°42\'00" ; W 122°19\'00"/N 37°59\'00" ; W 121°43\'00"/N 37°21\'00" ; W 122°13\'00"/N 37°04\'00"';
      const result = parseMARC034(input);
      expect(result).not.toBeNull();
      // west = min lon = -122.8, east = max lon = -121.7167, north = max lat = 37.9833, south = min lat = 37.0667
      expect(result!.west).toBeCloseTo(-122.8, 3);
      expect(result!.east).toBeCloseTo(-121.7167, 3);
      expect(result!.north).toBeCloseTo(37.9833, 3);
      expect(result!.south).toBeCloseTo(37.0667, 3);
    });

    it('normalizes 0–360 east longitudes (E 286° → ~W 74°)', () => {
      const input = '$$f E 286°01\'42"/N 40°45\'48" ; E 286°01\'00"/N 40°46\'05" ; E 286°02\'27"/N 40°48\'06" ; E 286°03\'09"/N 40°47\'49" ; E 286°01\'42"/N 40°45\'48"';
      const result = parseMARC034(input);
      expect(result).not.toBeNull();
      // E 286° normalizes to 286 - 360 = -74°
      expect(result!.west).toBeLessThan(-73);
      expect(result!.east).toBeLessThan(-73);
      expect(result!.north).toBeGreaterThan(40);
      expect(result!.south).toBeGreaterThan(40);
    });

    it('returns null with fewer than 3 vertices', () => {
      expect(parseMARC034('$$f W 10°00\'00"/N 50°00\'00" ; W 11°00\'00"/N 51°00\'00"')).toBeNull();
    });
  });

  describe('MARC 034 G-polygon ($$t/$$s subfields)', () => {
    it('parses W/N polygon', () => {
      const input = '$$tW1221300$$sN0370400$$tW1224800$$sN0374200$$tW1221900$$sN0375900$$tW1214300$$sN0372100$$tW1221300$$sN0370400';
      const result = parseMARC034(input);
      expect(result).not.toBeNull();
      // lons: -122.2167, -122.8, -122.3167, -121.7167 → west=-122.8, east=-121.7167
      expect(result!.west).toBeCloseTo(-122.8, 3);
      expect(result!.east).toBeCloseTo(-121.7167, 3);
      expect(result!.north).toBeCloseTo(37.9833, 3);
      expect(result!.south).toBeCloseTo(37.0667, 3);
    });

    it('parses E-only polygon', () => {
      const input = '$$tE0030527$$sN0454300$$tE0030138$$sN0455006$$tE0031655$$sN0455406$$tE0032045$$sN0454700$$tE0030527$$sN0454300';
      const result = parseMARC034(input);
      expect(result).not.toBeNull();
      expect(result!.west).toBeGreaterThan(3);
      expect(result!.east).toBeGreaterThan(3);
      expect(result!.north).toBeCloseTo(45.9017, 3);
      expect(result!.south).toBeCloseTo(45.7167, 3);
    });

    it('returns null with fewer than 3 vertex pairs', () => {
      expect(parseMARC034('$$tW1000000$$sN0500000$$tW1010000$$sN0510000')).toBeNull();
    });
  });

  describe('zero coordinates', () => {
    it('handles zero (0°00\'00") correctly', () => {
      const result = parseMARC034('$$dE0000000$$eE0000000$$fN0000000$$gN0000000');
      expect(result).not.toBeNull();
      expect(result!.west).toBe(0);
      expect(result!.east).toBe(0);
      expect(result!.north).toBe(0);
      expect(result!.south).toBe(0);
    });
  });
});
