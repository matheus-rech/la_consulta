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
    (localStorage.getItem as jest.Mock).mockClear();
    (localStorage.setItem as jest.Mock).mockClear();
  });

  describe('addExtraction', () => {
    it('should add valid extraction', () => {
      const extraction: Extraction = {
        id: 'ext_123',
        timestamp: Date.now(),
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
        timestamp: Date.now(),
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

      ExtractionTracker.addExtraction(invalid as any);

      expect(mockStatusManager.show).toHaveBeenCalledWith(
        expect.stringContaining('Invalid'),
        'error'
      );
    });
  });

  describe('getExtractions', () => {
    it('should return all extractions', () => {
      const extractions: Extraction[] = [
        {
          id: 'ext_1',
          timestamp: Date.now(),
          fieldName: 'field1',
          text: 'text1',
          page: 1,
          coordinates: { left: 0, top: 0, width: 10, height: 10 },
          method: 'manual',
          documentName: 'test.pdf',
        },
      ];

      mockAppStateManager.getState.mockReturnValue({ extractions });

      const result = ExtractionTracker.getExtractions();
      expect(result).toEqual(extractions);
    });
  });

  describe('clearExtractions', () => {
    it('should clear all extractions', () => {
      ExtractionTracker.clearExtractions();

      expect(mockAppStateManager.setState).toHaveBeenCalledWith({
        extractions: [],
      });
    });
  });

  describe('persistence', () => {
    it('should save to localStorage', () => {
      const extractions: Extraction[] = [
        {
          id: 'ext_1',
          timestamp: Date.now(),
          fieldName: 'test',
          text: 'test',
          page: 1,
          coordinates: { left: 0, top: 0, width: 10, height: 10 },
          method: 'manual',
          documentName: 'test.pdf',
        },
      ];

      mockAppStateManager.getState.mockReturnValue({ extractions });

      ExtractionTracker.saveToStorage();

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'clinical_extractions_simple',
        expect.any(String)
      );
    });

    it('should load from localStorage', () => {
      const savedData = {
        extractions: [
          {
            id: 'ext_1',
            timestamp: Date.now(),
            fieldName: 'test',
            text: 'test',
            page: 1,
            coordinates: { left: 0, top: 0, width: 10, height: 10 },
            method: 'manual',
            documentName: 'test.pdf',
          },
        ],
        version: '1.0',
      };

      (localStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify(savedData)
      );

      ExtractionTracker.loadFromStorage();

      expect(mockAppStateManager.setState).toHaveBeenCalledWith({
        extractions: savedData.extractions,
      });
    });

    it('should handle corrupted localStorage data', () => {
      (localStorage.getItem as jest.Mock).mockReturnValue('invalid json');

      ExtractionTracker.loadFromStorage();

      expect(mockStatusManager.show).toHaveBeenCalledWith(
        expect.stringContaining('Failed'),
        'error'
      );
    });
  });
});
