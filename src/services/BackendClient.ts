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
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    const tokens: AuthTokens = await response.json();
    this.saveTokenToStorage(tokens.access_token);
    return tokens;
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
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const tokens: AuthTokens = await response.json();
    this.saveTokenToStorage(tokens.access_token);
    return tokens;
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

    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.clearTokenFromStorage();
      throw new Error('Session expired. Please login again.');
    }

    return response;
  }

  async generatePICO(pdfText: string): Promise<any> {
    const response = await this.authenticatedRequest('/api/ai/generate-pico', {
      method: 'POST',
      body: JSON.stringify({ pdf_text: pdfText }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'PICO generation failed');
    }

    return await response.json();
  }

  async generateSummary(pdfText: string): Promise<any> {
    const response = await this.authenticatedRequest('/api/ai/generate-summary', {
      method: 'POST',
      body: JSON.stringify({ pdf_text: pdfText }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Summary generation failed');
    }

    return await response.json();
  }

  async validateField(fieldId: string, fieldValue: string, pdfText: string): Promise<any> {
    const response = await this.authenticatedRequest('/api/ai/validate-field', {
      method: 'POST',
      body: JSON.stringify({
        field_id: fieldId,
        field_value: fieldValue,
        pdf_text: pdfText,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Field validation failed');
    }

    return await response.json();
  }

  async findMetadata(pdfText: string): Promise<any> {
    const response = await this.authenticatedRequest('/api/ai/find-metadata', {
      method: 'POST',
      body: JSON.stringify({ pdf_text: pdfText }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Metadata search failed');
    }

    return await response.json();
  }

  async extractTables(pdfText: string): Promise<any> {
    const response = await this.authenticatedRequest('/api/ai/extract-tables', {
      method: 'POST',
      body: JSON.stringify({ pdf_text: pdfText }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Table extraction failed');
    }

    return await response.json();
  }

  async analyzeImage(imageBase64: string, prompt: string): Promise<any> {
    const response = await this.authenticatedRequest('/api/ai/analyze-image', {
      method: 'POST',
      body: JSON.stringify({
        image_base64: imageBase64,
        prompt: prompt,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Image analysis failed');
    }

    return await response.json();
  }

  async deepAnalysis(pdfText: string, prompt: string): Promise<any> {
    const response = await this.authenticatedRequest('/api/ai/deep-analysis', {
      method: 'POST',
      body: JSON.stringify({
        pdf_text: pdfText,
        prompt: prompt,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Deep analysis failed');
    }

    return await response.json();
  }

  async uploadDocument(filename: string, pdfData: string, totalPages: number, metadata?: any): Promise<any> {
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
      const error = await response.json();
      throw new Error(error.detail || 'Document upload failed');
    }

    return await response.json();
  }

  async getDocuments(): Promise<any[]> {
    const response = await this.authenticatedRequest('/api/documents', {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch documents');
    }

    return await response.json();
  }

  async getDocument(documentId: string): Promise<any> {
    const response = await this.authenticatedRequest(`/api/documents/${documentId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to fetch document');
    }

    return await response.json();
  }

  async deleteDocument(documentId: string): Promise<void> {
    const response = await this.authenticatedRequest(`/api/documents/${documentId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to delete document');
    }
  }
}

export default new BackendClient();
