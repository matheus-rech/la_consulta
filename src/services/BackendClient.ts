/**
 * BackendClient
 * HTTP client for communicating with the la_consulta backend API
 * Handles authentication, token management, and API requests
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8080';

interface AuthTokens {
  access_token: string;
  token_type: string;
}

class BackendClient {
  private accessToken: string | null = null;

  constructor() {
    this.loadTokenFromStorage();
  }

  private loadTokenFromStorage(): void {
    const token = localStorage.getItem('la_consulta_access_token');
    if (token) {
      this.accessToken = token;
    }
  }

  private saveTokenToStorage(token: string): void {
    localStorage.setItem('la_consulta_access_token', token);
    this.accessToken = token;
  }

  private clearTokenFromStorage(): void {
    localStorage.removeItem('la_consulta_access_token');
    this.accessToken = null;
  }

  async register(email: string, password: string): Promise<AuthTokens> {
    const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      let errorDetail = 'Registration failed';
      try {
        const error = await response.json();
        errorDetail = error.detail || error.message || errorDetail;
      } catch {
        const text = await response.text().catch(() => '');
        errorDetail = text || errorDetail;
      }
      throw new Error(errorDetail);
    }
  }

  async login(email: string, password: string): Promise<AuthTokens> {
    const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      let errorDetail = 'Login failed';
      try {
        const error = await response.json();
        errorDetail = error.detail || error.message || errorDetail;
      } catch {
        const text = await response.text().catch(() => '');
        errorDetail = text || errorDetail;
      }
      const error = new Error(errorDetail);
      // Attach status code for better error handling
      (error as any).status = response.status;
      throw error;
    }
  }

  logout(): void {
    this.clearTokenFromStorage();
  }

  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  private async authenticatedRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    if (!this.accessToken) {
      throw new Error('Not authenticated. Please login first.');
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken}`,
      ...options.headers,
    };

    try {
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        this.clearTokenFromStorage();
        throw new Error('Session expired. Please login again.');
      }

      return response;
    } catch (error) {
      if (error instanceof Error) {
        // Re-throw our custom errors
        if (error.message.includes('Session expired') || error.message.includes('Not authenticated')) {
          throw error;
        }
        // Network errors - provide user-friendly message
        throw new Error(`Network error: ${error.message}`);
      }
      throw new Error('An unexpected network error occurred');
    }
  }

  async generatePICO(documentId: string, pdfText: string): Promise<any> {
    const response = await this.authenticatedRequest('/api/ai/generate-pico', {
      method: 'POST',
      body: JSON.stringify({ document_id: documentId, pdf_text: pdfText }),
    });

    if (!response.ok) {
      let errorDetail = 'PICO generation failed';
      try {
        const error = await response.json();
        errorDetail = error.detail || error.message || errorDetail;
      } catch {
        const text = await response.text().catch(() => '');
        errorDetail = text || errorDetail;
      }
      throw new Error(errorDetail);
    }
  }

  async generateSummary(documentId: string, pdfText: string): Promise<any> {
    const response = await this.authenticatedRequest('/api/ai/generate-summary', {
      method: 'POST',
      body: JSON.stringify({ document_id: documentId, pdf_text: pdfText }),
    });

    if (!response.ok) {
      let errorDetail = 'Summary generation failed';
      try {
        const error = await response.json();
        errorDetail = error.detail || error.message || errorDetail;
      } catch {
        const text = await response.text().catch(() => '');
        errorDetail = text || errorDetail;
      }
      throw new Error(errorDetail);
    }
  }

  async validateField(documentId: string, fieldId: string, fieldValue: string, pdfText: string): Promise<any> {
    const response = await this.authenticatedRequest('/api/ai/validate-field', {
      method: 'POST',
      body: JSON.stringify({
        document_id: documentId,
        field_id: fieldId,
        field_value: fieldValue,
        pdf_text: pdfText,
      }),
    });

    if (!response.ok) {
      let errorDetail = 'Field validation failed';
      try {
        const error = await response.json();
        errorDetail = error.detail || error.message || errorDetail;
      } catch {
        const text = await response.text().catch(() => '');
        errorDetail = text || errorDetail;
      }
      throw new Error(errorDetail);
    }
  }

  async findMetadata(documentId: string, pdfText: string): Promise<any> {
    const response = await this.authenticatedRequest('/api/ai/find-metadata', {
      method: 'POST',
      body: JSON.stringify({ document_id: documentId, pdf_text: pdfText }),
    });

    if (!response.ok) {
      let errorDetail = 'Metadata search failed';
      try {
        const error = await response.json();
        errorDetail = error.detail || error.message || errorDetail;
      } catch {
        const text = await response.text().catch(() => '');
        errorDetail = text || errorDetail;
      }
      throw new Error(errorDetail);
    }
  }

  async extractTables(documentId: string, pdfText: string): Promise<any> {
    const response = await this.authenticatedRequest('/api/ai/extract-tables', {
      method: 'POST',
      body: JSON.stringify({ document_id: documentId, pdf_text: pdfText }),
    });

    if (!response.ok) {
      let errorDetail = 'Table extraction failed';
      try {
        const error = await response.json();
        errorDetail = error.detail || error.message || errorDetail;
      } catch {
        const text = await response.text().catch(() => '');
        errorDetail = text || errorDetail;
      }
      throw new Error(errorDetail);
    }
  }

  async analyzeImage(documentId: string, imageBase64: string, prompt: string): Promise<any> {
    const response = await this.authenticatedRequest('/api/ai/analyze-image', {
      method: 'POST',
      body: JSON.stringify({
        document_id: documentId,
        image_base64: imageBase64,
        prompt: prompt,
      }),
    });

    if (!response.ok) {
      let errorDetail = 'Image analysis failed';
      try {
        const error = await response.json();
        errorDetail = error.detail || error.message || errorDetail;
      } catch {
        const text = await response.text().catch(() => '');
        errorDetail = text || errorDetail;
      }
      throw new Error(errorDetail);
    }
  }

  async deepAnalysis(documentId: string, pdfText: string, prompt: string): Promise<any> {
    const response = await this.authenticatedRequest('/api/ai/deep-analysis', {
      method: 'POST',
      body: JSON.stringify({
        document_id: documentId,
        pdf_text: pdfText,
        prompt: prompt,
      }),
    });

    if (!response.ok) {
      let errorDetail = 'Deep analysis failed';
      try {
        const error = await response.json();
        errorDetail = error.detail || error.message || errorDetail;
      } catch {
        const text = await response.text().catch(() => '');
        errorDetail = text || errorDetail;
      }
      throw new Error(errorDetail);
    }
  }

  async uploadDocument(filename: string, pdfData: string, totalPages: number, metadata?: any): Promise<any> {
    try {
      const response = await this.authenticatedRequest('/api/documents', {
        method: 'POST',
        body: JSON.stringify({
          filename,
          pdf_data: pdfData,
          total_pages: totalPages,
          metadata,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Document upload failed';
        try {
          const error = await response.json();
          errorMessage = error.detail || errorMessage;
        } catch {
          // If JSON parsing fails, use the default error message
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Document upload') || 
            error.message.includes('Network error') ||
            error.message.includes('Session expired')) {
          throw error;
        }
        throw new Error(`Document upload failed: ${error.message}`);
      }
      throw new Error('Document upload failed due to an unexpected error');
    }
  }

  async getDocuments(): Promise<any[]> {
    try {
      const response = await this.authenticatedRequest('/api/documents', {
        method: 'GET',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to fetch documents';
        try {
          const error = await response.json();
          errorMessage = error.detail || errorMessage;
        } catch {
          // If JSON parsing fails, use the default error message
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch documents') || 
            error.message.includes('Network error') ||
            error.message.includes('Session expired')) {
          throw error;
        }
        throw new Error(`Failed to fetch documents: ${error.message}`);
      }
      throw new Error('Failed to fetch documents due to an unexpected error');
    }
  }

  async getDocument(documentId: string): Promise<any> {
    try {
      const response = await this.authenticatedRequest(`/api/documents/${documentId}`, {
        method: 'GET',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to fetch document';
        try {
          const error = await response.json();
          errorMessage = error.detail || errorMessage;
        } catch {
          // If JSON parsing fails, use the default error message
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch document') || 
            error.message.includes('Network error') ||
            error.message.includes('Session expired')) {
          throw error;
        }
        throw new Error(`Failed to fetch document: ${error.message}`);
      }
      throw new Error('Failed to fetch document due to an unexpected error');
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    try {
      const response = await this.authenticatedRequest(`/api/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        let errorMessage = 'Failed to delete document';
        try {
          const error = await response.json();
          errorMessage = error.detail || errorMessage;
        } catch {
          // If JSON parsing fails, use the default error message
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Failed to delete document') || 
            error.message.includes('Network error') ||
            error.message.includes('Session expired')) {
          throw error;
        }
        throw new Error(`Failed to delete document: ${error.message}`);
      }
      throw new Error('Failed to delete document due to an unexpected error');
    }
  }
}

export default new BackendClient();
