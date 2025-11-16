import ExtractionTracker from '../../src/data/ExtractionTracker';
import type { Extraction } from '../../src/types';

describe('ExtractionTracker', () => {
  let mockAppStateManager: any;
  let mockStatusManager: any;

  beforeEach(() => {
    mockAppStateManager = {
      getState: jest.fn(() => ({
        extractions: [],
        documentName: 'test.pdf',
      })),
      setState: jest.fn(),
    };

    mockStatusManager = {
      show: jest.fn(),
    };

    ExtractionTracker.setDependencies({
      appStateManager: mockAppStateManager,
      statusManager: mockStatusManager,
      pdfRenderer: {},
    });

    localStorage.clear();
  });

  describe('addExtraction', () => {
    it('should add valid extraction', () => {
      const extraction: Extraction = {
        id: 'ext_123',
        timestamp: new Date().toISOString(),
        fieldName: 'study_title',
        text: 'Clinical Study Title',
        page: 1,
        coordinates: { left: 10, top: 20, width: 100, height: 20 },
        method: 'manual',
        documentName: 'test.pdf',
      };

      ExtractionTracker.addExtraction(extraction);

      expect(mockAppStateManager.setState).toHaveBeenCalledWith({
        extractions: [extraction],
      });
    });

    it('should sanitize text before adding', () => {
      const extraction: Extraction = {
        id: 'ext_123',
        timestamp: new Date().toISOString(),
        fieldName: 'test',
        text: '<script>alert("xss")</script>Safe text',
        page: 1,
        coordinates: { left: 0, top: 0, width: 10, height: 10 },
        method: 'manual',
        documentName: 'test.pdf',
      };

      ExtractionTracker.addExtraction(extraction);

      const call = mockAppStateManager.setState.mock.calls[0][0];
      expect(call.extractions[0].text).not.toContain('<script>');
    });

    it('should reject invalid extraction', () => {
      const invalid = {
        text: 'Missing required fields',
      };

      const result = ExtractionTracker.addExtraction(invalid as any);

      // Invalid extractions should return null
      expect(result).toBeNull();
    });
  });

  describe('getExtractions', () => {
    it('should return all extractions', () => {
      const extraction: Extraction = {
        id: 'ext_1',
        timestamp: new Date().toISOString(),
        fieldName: 'field1',
        text: 'text1',
        page: 1,
        coordinates: { left: 0, top: 0, width: 10, height: 10 },
        method: 'manual',
        documentName: 'test.pdf',
      };

      // Add extraction
      ExtractionTracker.addExtraction(extraction);

      const result = ExtractionTracker.getExtractions();
      // Should have at least one extraction
      expect(result.length).toBeGreaterThan(0);
      // The last extraction should match what we just added
      const lastExtraction = result[result.length - 1];
      expect(lastExtraction.fieldName).toBe('field1');
      expect(lastExtraction.text).toBe('text1');
    });
  });

  describe('persistence', () => {
    it('should save extractions to localStorage when adding', () => {
      const extraction: Extraction = {
        id: 'ext_test',
        timestamp: new Date().toISOString(),
        fieldName: 'test',
        text: 'test',
        page: 1,
        coordinates: { left: 0, top: 0, width: 10, height: 10 },
        method: 'manual',
        documentName: 'test.pdf',
      };
      
      ExtractionTracker.addExtraction(extraction);

      // Verify data was saved to localStorage
      const savedData = localStorage.getItem('clinical_extractions_simple');
      expect(savedData).not.toBeNull();
      
      const parsed = JSON.parse(savedData!);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[parsed.length - 1].fieldName).toBe('test');
    });

    it('should explicitly save to localStorage via saveToStorage', () => {
      // Add extractions directly to tracker (bypassing addExtraction)
      const extraction: Extraction = {
        id: 'ext_direct',
        timestamp: new Date().toISOString(),
        fieldName: 'direct_test',
        text: 'direct save test',
        page: 1,
        coordinates: { left: 0, top: 0, width: 10, height: 10 },
        method: 'manual',
        documentName: 'test.pdf',
      };
      
      ExtractionTracker.extractions.push(extraction);
      ExtractionTracker.saveToStorage();

      // Verify the save was successful
      const savedData = localStorage.getItem('clinical_extractions_simple');
      expect(savedData).not.toBeNull();
      
      const parsed = JSON.parse(savedData!);
      expect(parsed.some((e: Extraction) => e.fieldName === 'direct_test')).toBe(true);
    });

    it('should load extractions from localStorage', () => {
      // Setup: Save test data to localStorage
      const testExtractions: Extraction[] = [
        {
          id: 'ext_loaded_1',
          timestamp: new Date().toISOString(),
          fieldName: 'loaded_field_1',
          text: 'loaded text 1',
          page: 1,
          coordinates: { left: 10, top: 20, width: 30, height: 40 },
          method: 'manual',
          documentName: 'loaded.pdf',
        },
        {
          id: 'ext_loaded_2',
          timestamp: new Date().toISOString(),
          fieldName: 'loaded_field_2',
          text: 'loaded text 2',
          page: 2,
          coordinates: { left: 50, top: 60, width: 70, height: 80 },
          method: 'gemini-pico',
          documentName: 'loaded.pdf',
        },
      ];
      
      localStorage.setItem('clinical_extractions_simple', JSON.stringify(testExtractions));

      // Clear current extractions and reload
      ExtractionTracker.extractions = [];
      ExtractionTracker.loadFromStorage();

      // Verify extractions were loaded
      const loadedExtractions = ExtractionTracker.getExtractions();
      expect(loadedExtractions.length).toBe(2);
      expect(loadedExtractions[0].fieldName).toBe('loaded_field_1');
      expect(loadedExtractions[1].fieldName).toBe('loaded_field_2');
      
      // Verify state was updated
      expect(mockAppStateManager.setState).toHaveBeenCalledWith({
        extractions: testExtractions,
      });
    });

    it('should handle corrupted localStorage data gracefully', () => {
      // Setup: Put invalid JSON in localStorage
      localStorage.setItem('clinical_extractions_simple', 'invalid json {{{');

      // Clear extractions and attempt to load
      ExtractionTracker.extractions = [];
      ExtractionTracker.loadFromStorage();

      // Verify it handled the error gracefully
      const extractions = ExtractionTracker.getExtractions();
      expect(extractions).toEqual([]);
    });

    it('should handle missing localStorage data', () => {
      // Ensure no data in localStorage
      localStorage.removeItem('clinical_extractions_simple');

      // Attempt to load
      ExtractionTracker.extractions = [];
      ExtractionTracker.loadFromStorage();

      // Should have empty extractions array
      const extractions = ExtractionTracker.getExtractions();
      expect(extractions).toEqual([]);
    });
  });
});
