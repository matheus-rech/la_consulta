import SecurityUtils from '../../src/utils/security';

describe('SecurityUtils', () => {
  describe('sanitizeText', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const result = SecurityUtils.sanitizeText(input);
      expect(result).toBe('Hello');
    });

    it('should limit text length', () => {
      const input = 'a'.repeat(20000);
      const result = SecurityUtils.sanitizeText(input);
      expect(result.length).toBeLessThanOrEqual(10000);
    });

    it('should handle empty strings', () => {
      expect(SecurityUtils.sanitizeText('')).toBe('');
    });

    it('should preserve normal text', () => {
      const input = 'Normal clinical text with numbers 123';
      expect(SecurityUtils.sanitizeText(input)).toBe(input);
    });
  });

  describe('escapeHtml', () => {
    it('should escape dangerous characters', () => {
      const input = '<div>"test" & \'quote\'</div>';
      const result = SecurityUtils.escapeHtml(input);
      
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&quot;');
      expect(result).toContain('&#039;');
      expect(result).toContain('&amp;');
    });
  });

  describe('validateInput', () => {
    it('should validate DOI format', () => {
      const validDOI = document.createElement('input');
      validDOI.setAttribute('data-validation', 'doi');
      validDOI.value = '10.1234/test.2024';

      const result = SecurityUtils.validateInput(validDOI);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid DOI', () => {
      const invalidDOI = document.createElement('input');
      invalidDOI.setAttribute('data-validation', 'doi');
      invalidDOI.value = 'not-a-doi';

      const result = SecurityUtils.validateInput(invalidDOI);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('DOI');
    });

    it('should validate PMID format', () => {
      const validPMID = document.createElement('input');
      validPMID.setAttribute('data-validation', 'pmid');
      validPMID.value = '12345678';

      const result = SecurityUtils.validateInput(validPMID);
      expect(result.valid).toBe(true);
    });

    it('should validate year range', () => {
      const validYear = document.createElement('input');
      validYear.setAttribute('data-validation', 'year');
      validYear.value = '2024';

      const result = SecurityUtils.validateInput(validYear);
      expect(result.valid).toBe(true);
    });

    it('should reject future years', () => {
      const futureYear = document.createElement('input');
      futureYear.setAttribute('data-validation', 'year');
      futureYear.value = '2100';

      const result = SecurityUtils.validateInput(futureYear);
      expect(result.valid).toBe(false);
    });

    it('should validate number fields', () => {
      const validNumber = document.createElement('input');
      validNumber.setAttribute('data-validation', 'number');
      validNumber.value = '42';

      const result = SecurityUtils.validateInput(validNumber);
      expect(result.valid).toBe(true);
    });

    it('should handle required fields', () => {
      const requiredField = document.createElement('input');
      requiredField.setAttribute('required', 'true');
      requiredField.value = '';

      const result = SecurityUtils.validateInput(requiredField);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('required');
    });
  });

  describe('validateExtraction', () => {
    it('should validate complete extraction object', () => {
      const extraction = {
        id: 'ext_123',
        timestamp: Date.now(),
        fieldName: 'study_title',
        text: 'Clinical Study',
        page: 1,
        coordinates: { left: 10, top: 20, width: 100, height: 20 },
        method: 'manual' as const,
        documentName: 'test.pdf',
      };

      expect(SecurityUtils.validateExtraction(extraction)).toBe(true);
    });

    it('should reject extraction with missing fields', () => {
      const incomplete = {
        id: 'ext_123',
        text: 'Some text',
      };

      expect(SecurityUtils.validateExtraction(incomplete as any)).toBe(false);
    });

    it('should reject extraction with invalid method', () => {
      const invalid = {
        id: 'ext_123',
        timestamp: Date.now(),
        fieldName: 'test',
        text: 'text',
        page: 1,
        coordinates: { left: 0, top: 0, width: 10, height: 10 },
        method: 'invalid_method',
        documentName: 'test.pdf',
      };

      expect(SecurityUtils.validateExtraction(invalid as any)).toBe(false);
    });
  });
});
