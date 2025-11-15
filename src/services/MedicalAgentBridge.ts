/**
 * MedicalAgentBridge.ts
 *
 * Gemini-based implementation of medical research agents
 * Mimics the behavior of the Python multi-agent system using specialized prompts
 */

import type { ExtractedTable } from './TableExtractor';
import type { ExtractedFigure } from './FigureExtractor';
import type { AgentResult } from './AgentOrchestrator';

// ==================== AGENT PROMPT TEMPLATES ====================

const AGENT_PROMPTS = {
    StudyDesignExpertAgent: `You are a Study Design Expert analyzing medical research methodology.
Your expertise: research design, inclusion/exclusion criteria, study types, sample selection.
Accuracy: 92%

Analyze the provided data and extract:
- Study type (RCT, cohort, case-control, etc.)
- Inclusion/exclusion criteria
- Sample selection method
- Study period
- Methodology details

Provide confidence score (0-1) for each extraction.`,

    PatientDataSpecialistAgent: `You are a Patient Data Specialist extracting demographics and baseline characteristics.
Your expertise: patient demographics, sample sizes, baseline characteristics.
Accuracy: 88%

Extract from the data:
- Total sample size (N)
- Age (mean, median, range)
- Sex/Gender distribution
- Baseline characteristics
- Group comparisons

Provide confidence score (0-1) for each field.`,

    SurgicalExpertAgent: `You are a Surgical Expert analyzing surgical procedures and techniques.
Your expertise: surgical procedures, operative techniques, surgical outcomes.
Accuracy: 91%

Extract surgical details:
- Type of surgery/procedure
- Surgical technique details
- Operative time
- Surgical approach
- Intraoperative findings

Provide confidence score (0-1) for each extraction.`,

    OutcomesAnalystAgent: `You are an Outcomes Analyst extracting statistics and clinical outcomes.
Your expertise: mortality rates, mRS scores, outcome measures, statistical analysis.
Accuracy: 89%

Extract outcome data:
- Primary outcomes (mortality, mRS, etc.)
- Secondary outcomes
- Follow-up period
- Statistical significance (p-values)
- Effect sizes

Provide confidence score (0-1) for each field.`,

    NeuroimagingSpecialistAgent: `You are a Neuroimaging Specialist analyzing imaging data.
Your expertise: CT/MRI findings, lesion volumes, brain swelling, imaging measurements.
Accuracy: 92%

Extract imaging data:
- Lesion volume (mm³ or cm³)
- Brain swelling measurements
- Imaging modality (CT, MRI)
- Imaging findings
- Quantitative measurements

Provide confidence score (0-1) for each value.`,

    TableExtractorAgent: `You are a Table Structure Validator using vision-based analysis.
Your expertise: table structure validation, data type detection, quality assessment.
Confidence: 100%

Validate the table structure:
- Verify headers match data
- Check for missing values
- Identify data types (numeric, percentage, categorical)
- Assess table quality (5 factors)
- Suggest corrections if needed

Provide overall confidence score (0-1).`
};

// ==================== MEDICAL AGENT BRIDGE ====================

class MedicalAgentBridge {
    private geminiApiKey: string;

    constructor() {
        this.geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    }

    /**
     * Call a medical agent with specialized prompt
     */
    async callAgent(
        agentName: keyof typeof AGENT_PROMPTS,
        data: ExtractedTable | ExtractedFigure,
        dataType: 'table' | 'figure'
    ): Promise<AgentResult> {
        const startTime = Date.now();

        try {
            // Build agent-specific prompt
            const prompt = this.buildAgentPrompt(agentName, data, dataType);

            // Call Gemini API
            const response = await this.callGeminiAgent(prompt, agentName);

            // Parse response
            const parsedData = this.parseAgentResponse(response, agentName);

            return {
                agentName,
                confidence: parsedData.confidence,
                extractedData: parsedData.data,
                processingTime: Date.now() - startTime,
                validationStatus: parsedData.confidence > 0.85 ? 'validated' : 'needs_review',
                sourceQuote: parsedData.sourceQuote,
                pageNumber: 'pageNum' in data ? data.pageNum : undefined
            };

        } catch (error: any) {
            console.error(`Agent ${agentName} error:`, error.message);
            return {
                agentName,
                confidence: 0,
                extractedData: null,
                processingTime: Date.now() - startTime,
                validationStatus: 'failed'
            };
        }
    }

    /**
     * Build specialized prompt for each agent
     */
    private buildAgentPrompt(
        agentName: keyof typeof AGENT_PROMPTS,
        data: ExtractedTable | ExtractedFigure,
        dataType: 'table' | 'figure'
    ): string {
        const systemPrompt = AGENT_PROMPTS[agentName];

        let dataContent = '';

        if (dataType === 'table') {
            const table = data as ExtractedTable;
            dataContent = `
TABLE DATA:
Headers: ${table.headers.join(' | ')}
Rows (first 5):
${table.rows.slice(0, 5).map(row => row.join(' | ')).join('\n')}

Total rows: ${table.rows.length}
Total columns: ${table.headers.length}
`;
        } else {
            const figure = data as ExtractedFigure;
            dataContent = `
FIGURE DATA:
ID: ${figure.id}
Page: ${figure.pageNum}
Dimensions: ${figure.width}x${figure.height}
Extraction Method: ${figure.extractionMethod}
`;
        }

        return `${systemPrompt}

${dataContent}

Instructions:
1. Analyze the data using your specialized expertise
2. Extract relevant information with high precision
3. Provide confidence scores for each extraction
4. Include source quotes where possible

Respond with JSON:
{
  "extractedFields": {
    "field1": {"value": "...", "confidence": 0.95},
    "field2": {"value": "...", "confidence": 0.88}
  },
  "overallConfidence": 0.92,
  "sourceQuote": "Direct quote from data",
  "insights": ["Clinical insight 1", "Clinical insight 2"]
}`;
    }

    /**
     * Call Gemini API with agent prompt
     */
    private async callGeminiAgent(prompt: string, agentName: string): Promise<string> {
        // Select model based on agent
        const model = agentName === 'TableExtractorAgent'
            ? 'gemini-2.0-flash-exp'  // Fast for validation
            : 'gemini-2.0-flash-thinking-exp-1219';  // Thinking for complex extraction

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiApiKey}`;

        const requestBody = {
            contents: [{
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                temperature: 0.2,  // Low temperature for factual extraction
                topP: 0.8,
                topK: 40,
                maxOutputTokens: 2048,
                responseMimeType: "application/json"
            }
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.statusText}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('No response from Gemini API');
        }

        return text;
    }

    /**
     * Parse agent response
     */
    private parseAgentResponse(response: string, agentName: string): {
        confidence: number,
        data: any,
        sourceQuote?: string
    } {
        try {
            // Try to parse as JSON
            const parsed = JSON.parse(response);

            return {
                confidence: parsed.overallConfidence || 0.80,
                data: parsed.extractedFields || parsed,
                sourceQuote: parsed.sourceQuote || `Extracted by ${agentName}`
            };

        } catch (error) {
            // Fallback: return raw response
            console.warn(`Failed to parse ${agentName} response as JSON, using raw text`);

            return {
                confidence: 0.70,
                data: { rawResponse: response },
                sourceQuote: response.substring(0, 200)
            };
        }
    }

    /**
     * Batch process multiple agent calls
     */
    async callMultipleAgents(
        agentNames: Array<keyof typeof AGENT_PROMPTS>,
        data: ExtractedTable | ExtractedFigure,
        dataType: 'table' | 'figure'
    ): Promise<AgentResult[]> {
        console.log(`Calling ${agentNames.length} agents in parallel...`);

        const results = await Promise.all(
            agentNames.map(name => this.callAgent(name, data, dataType))
        );

        return results;
    }
}

// Export singleton instance
export default new MedicalAgentBridge();
export { AGENT_PROMPTS };
