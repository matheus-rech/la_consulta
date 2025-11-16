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

    // Reset ExtractionTracker state
    ExtractionTracker.extractions = [];
    ExtractionTracker.fieldMap = new Map();

    // Clear all mocks
    jest.clearAllMocks();
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

      // Should return null for invalid extraction
      expect(result).toBeNull();
      // Should not update state
      expect(mockAppStateManager.setState).not.toHaveBeenCalled();
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

      // Add extraction to tracker
      ExtractionTracker.extractions = [extraction];

      const result = ExtractionTracker.getExtractions();
      expect(result).toEqual([extraction]);
    });
  });

  describe('persistence', () => {
    it('should save to localStorage', () => {
      const extractions: Extraction[] = [
        {
          id: 'ext_1',
          timestamp: new Date().toISOString(),
          fieldName: 'test',
          text: 'test',
          page: 1,
          coordinates: { left: 0, top: 0, width: 10, height: 10 },
          method: 'manual',
          documentName: 'test.pdf',
        },
      ];

      mockAppStateManager.getState.mockReturnValue({ extractions });

      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

      ExtractionTracker.saveToStorage();

      expect(setItemSpy).toHaveBeenCalledWith(
        'clinical_extractions_simple',
        expect.any(String)
      );

      jest.restoreAllMocks();
    });

    it('should load from localStorage', () => {
      const savedExtractions = [
        {
          id: 'ext_1',
          timestamp: new Date().toISOString(),
          fieldName: 'test',
          text: 'test',
          page: 1,
          coordinates: { left: 0, top: 0, width: 10, height: 10 },
          method: 'manual',
          documentName: 'test.pdf',
        },
      ];

      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(
        JSON.stringify(savedExtractions)
      );

      ExtractionTracker.loadFromStorage();

      expect(mockAppStateManager.setState).toHaveBeenCalledWith({
        extractions: savedExtractions,
      });

      jest.restoreAllMocks();
    });

    it('should handle corrupted localStorage data', () => {
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('invalid json');

      ExtractionTracker.loadFromStorage();

      // Should reset extractions on error
      expect(ExtractionTracker.getExtractions()).toEqual([]);

      jest.restoreAllMocks();
    });
  });
});
