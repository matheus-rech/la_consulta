# Clinical Extractor Documentation

> **Complete documentation index for Clinical Extractor**

Welcome to the Clinical Extractor documentation! This guide will help you navigate all available documentation resources.

---

## 📚 Quick Navigation

- **New to the project?** Start with the [Main README](../README.md)
- **Setting up development?** See [Quick Start](#quick-start)
- **Looking for architecture details?** Check [Architecture Documentation](#architecture--technical-reference)
- **Need to integrate backend?** See [Backend Integration](BACKEND_INTEGRATION.md)
- **Testing the application?** Use [Manual Testing Guide](MANUAL_TESTING_GUIDE.md)

---

## 🚀 Quick Start

### Essential Docs for Getting Started

1. **[Main README](../README.md)** - Project overview, quick start, features
2. **[CLAUDE.md](../CLAUDE.md)** - Comprehensive guide for AI assistants (2,000+ lines)
3. **[Backend Integration](BACKEND_INTEGRATION.md)** - Secure API setup guide

### Installation Steps

```bash
# 1. Clone repository
git clone https://github.com/matheus-rech/la_consulta.git
cd la_consulta

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env.local
# Edit .env.local with your GEMINI_API_KEY

# 4. Start development server
npm run dev
```

---

## 📖 Core Documentation

### Main Guides

| Document | Description | Audience |
|----------|-------------|----------|
| **[README.md](../README.md)** | Project overview, quick start, features | Everyone |
| **[CLAUDE.md](../CLAUDE.md)** | Complete architecture guide for AI assistants | AI Assistants, Developers |
| **[Multi-Agent Pipeline](../MULTI_AGENT_PIPELINE_COMPLETE.md)** | Multi-agent AI system documentation | Developers, Researchers |
| **[AI Service Architecture](../AI_SERVICE_ARCHITECTURE.md)** | Gemini API integration details | Developers |

### Backend Documentation

| Document | Description |
|----------|-------------|
| **[Backend Integration](BACKEND_INTEGRATION.md)** | Complete frontend-backend setup guide |
| **[Backend README](../backend/README.md)** | Python FastAPI backend documentation |

---

## 🏗️ Architecture & Technical Reference

### Architecture Documentation

| Document | Location | Description |
|----------|----------|-------------|
| **[Architecture Map](../analysis/architecture-map.md)** | analysis/ | Complete system architecture overview |
| **[Executive Summary](../analysis/EXECUTIVE-SUMMARY.md)** | analysis/ | Current state assessment |
| **[Strategic Recommendations](../analysis/strategic-recommendations.md)** | analysis/ | Future development priorities |

### Technical Documentation

- **[CLAUDE.md](../CLAUDE.md)** - Complete technical guide (33 modules, 7 directories)
  - Module architecture
  - Dependency injection patterns
  - State management (Observer pattern)
  - Multi-agent pipeline
  - Citation provenance system
  - Error recovery system
  - Testing infrastructure

---

## 🧪 Testing & Quality Assurance

### Testing Documentation

| Document | Description | Coverage |
|----------|-------------|----------|
| **[Manual Testing Guide](MANUAL_TESTING_GUIDE.md)** | Complete manual testing procedures | All features |
| **[Feature Verification](Feature_Verification.md)** | Feature checklist and status | Feature matrix |

### Running Tests

```bash
# Unit tests
npm test

# Coverage report
npm run test:coverage

# Watch mode (development)
npm run test:watch

# End-to-end tests
npm run test:e2e
```

**Test Files Location**: `tests/unit/` and `tests/e2e/`

---

## 🎯 Development Guides

### For Developers

| Document | Purpose |
|----------|---------|
| **[Improvement Strategy](Clinical_Extractor_Improvement_Strategy.md)** | Production readiness roadmap |
| **[Backend Integration](BACKEND_INTEGRATION.md)** | Secure API implementation |
| **[Agent Prompts Reference](AGENT_PROMPTS_REFERENCE.md)** | Medical research agent prompts |

### Key Development Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Code Quality
npm run lint             # Lint TypeScript
npx tsc --noEmit         # Type checking

# Testing
npm test                 # Run all tests
npm run test:watch       # Watch mode
```

---

## 🔍 Feature Documentation

### Core Features

1. **PDF Processing**
   - Interactive rendering with PDF.js
   - Geometric figure and table extraction
   - Coordinate-level provenance tracking

2. **Multi-Agent AI Pipeline**
   - 6 specialized medical research agents
   - 95-96% accuracy through consensus
   - Confidence scoring and validation

3. **Citation Provenance**
   - Sentence-level coordinate tracking
   - Visual bounding box highlighting
   - Complete audit trails

4. **Export Formats**
   - JSON (full provenance)
   - CSV (spreadsheet analysis)
   - Excel/XLSX (systematic reviews)
   - HTML audit reports

5. **Error Recovery**
   - Automatic crash detection
   - Session restoration
   - Circuit breaker pattern

6. **Advanced Search**
   - Semantic search with TF-IDF
   - Fuzzy matching
   - Context-aware highlighting

---

## 📊 Analysis & Strategy

### Analysis Documents

| Document | Location | Purpose |
|----------|----------|---------|
| **[Executive Summary](../analysis/EXECUTIVE-SUMMARY.md)** | analysis/ | Current state, metrics, priorities |
| **[Top 10 Issues](../analysis/top-10-issues.md)** | analysis/ | Known issues and fixes |
| **[Strategic Recommendations](../analysis/strategic-recommendations.md)** | analysis/ | Future roadmap |
| **[Error Handling Implementation](../analysis/error-handling-implementation.md)** | analysis/ | Error handling patterns |
| **[TypeScript Fixes](../analysis/typescript-fixes.md)** | analysis/ | TypeScript improvements |
| **[Architecture Map](../analysis/architecture-map.md)** | analysis/ | System architecture |
| **[Quick Wins Complete](../analysis/quick-wins-complete.md)** | analysis/ | Completed improvements |

---

## 📦 Archive

Historical documentation and completed phases are archived for reference:

### Archive Structure

```
docs/archive/
├── PHASES/                          # Historical development phases
│   ├── PHASE_4.2_4.3_SUMMARY.md
│   ├── PHASE_5_4_COMPLETE.md
│   ├── PHASE_5_5_COMPLETE.md
│   ├── PHASE_5_INTEGRATION_NOTES.md
│   ├── PHASE_6_COMPLETE.md
│   └── REFACTORING_COMPLETE.md
│
├── DECISIONS/                       # Completed decisions and checklists
│   ├── VERIFICATION_CHECKLIST.md
│   ├── REGRESSION_FIXES.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   ├── quick-wins.md
│   └── google-sheets-decision.md
│
└── (other archived docs)
    ├── INTEGRATION_SUMMARY.md
    ├── INTEGRATION_CHECKLIST.md
    ├── INTEGRATION_VERIFICATION.md
    ├── FRONTEND_BACKEND_INTEGRATION.md
    └── NOBEL_PRIZE_IMPLEMENTATION_PLAN.md
```

**Note**: Archived docs are preserved for historical reference but may be outdated. Always refer to current documentation first.

---

## 🛠️ Module Reference

### Directory Structure

```
src/
├── main.ts                       # Entry point (947 lines)
├── types/                        # TypeScript interfaces
├── config/                       # App configuration
├── state/                        # State management
├── data/                         # Data persistence
├── forms/                        # Form wizard
├── pdf/                          # PDF processing
├── services/                     # AI, search, backend (16 services)
└── utils/                        # Helpers, error handling
```

### Key Modules (33 Total)

| Module | Lines | Purpose |
|--------|-------|---------|
| **main.ts** | 947 | Entry point & orchestration |
| **AIService.ts** | 715+ | Gemini AI integration |
| **PDFRenderer.ts** | 433 | Canvas rendering + bounding boxes |
| **AgentOrchestrator.ts** | 353 | Multi-agent coordination |
| **TableExtractor.ts** | 341 | Geometric table detection |
| **CitationService.ts** | 454 | Citation provenance tracking |
| **BackendProxyService.ts** | 488 | API proxy with retry/caching |

**See [CLAUDE.md](../CLAUDE.md) for complete module documentation.**

---

## 🌐 API Reference

### Frontend Window API (40+ Functions)

All exposed globally via `window.ClinicalExtractor`:

**Categories:**
- Helpers (8 functions)
- Fields (9 functions)
- AI (7 functions)
- Export (5 functions)
- Search (6 functions)
- Multi-Agent Pipeline (4 functions)
- Provenance Visualization (2 functions)
- Citation System (4 functions)
- Annotations (5 functions)
- Backend (3 functions)

**See [CLAUDE.md](../CLAUDE.md) for complete API documentation.**

---

## 🔐 Security

### Security Features

1. **API Key Protection**: Server-side only (backend/.env)
2. **JWT Authentication**: Token-based auth with auto-registration
3. **Rate Limiting**: 100 req/min general, 10 req/min AI
4. **Input Sanitization**: XSS prevention and validation
5. **CORS Protection**: Whitelist origins only
6. **Circuit Breaker**: Fault tolerance for APIs

**See [Backend Integration](BACKEND_INTEGRATION.md) for security setup.**

---

## 📈 Performance

### Metrics

- **PDF Load**: <1 second
- **Geometric Extraction**: 2-3 seconds
- **Multi-Agent Pipeline**: 15-30 seconds
- **Search Speed**: <100ms
- **Citation Lookup**: O(1)

### Accuracy

- **Multi-Agent Consensus**: 91-96%
- **Table Extraction**: 100% structural validation
- **Study Design Agent**: 92%
- **Neuroimaging Agent**: 92%
- **Surgical Expert Agent**: 91%

---

## 🤝 Contributing

### Development Workflow

1. Fork repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes with tests
4. Type check: `npx tsc --noEmit`
5. Run tests: `npm test`
6. Build: `npm run build`
7. Commit: `git commit -m "feat: Add amazing feature"`
8. Push: `git push origin feature/amazing-feature`
9. Open Pull Request

**See [Contributing Guidelines](../README.md#contributing) for details.**

---

## 🆘 Troubleshooting

### Common Issues

1. **Backend Won't Start**
   - Check port 8080: `lsof -i :8080`
   - Verify environment: `cat backend/.env`
   - Check Poetry: `poetry --version`

2. **Frontend Can't Connect**
   - Verify backend health: `curl http://localhost:8080/api/health`
   - Check CORS: `grep CORS_ORIGINS backend/.env`
   - Check frontend env: `cat .env.local`

3. **TypeScript Errors**
   - Run: `npx tsc --noEmit`
   - Check imports and types
   - Review [TypeScript Fixes](../analysis/typescript-fixes.md)

4. **Tests Failing**
   - Run: `npm test -- --verbose`
   - Check test setup: `tests/setup.ts`
   - Review error messages

**See individual documentation for detailed troubleshooting.**

---

## 📞 Support

### Getting Help

- **Documentation**: Start here or check [CLAUDE.md](../CLAUDE.md)
- **Issues**: [GitHub Issues](https://github.com/matheus-rech/la_consulta/issues)
- **Discussions**: [GitHub Discussions](https://github.com/matheus-rech/la_consulta/discussions)

### Reporting Bugs

Include:
1. Environment (browser, OS, Node version)
2. Steps to reproduce
3. Expected vs actual behavior
4. Screenshots and console logs

---

## 📚 External Resources

- [Vite Documentation](https://vitejs.dev/)
- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
- [Google Gemini API](https://ai.google.dev/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)

---

## 📋 Document Status

| Status | Count | Examples |
|--------|-------|----------|
| ✅ Current | 15 | README.md, CLAUDE.md, Backend Integration |
| 📦 Archived | 12 | Phase docs, completed checklists |
| 🔄 Living Docs | 3 | Architecture map, strategic recommendations |

**Last Updated**: November 2025

---

<div align="center">

**Navigate**: [Top](#clinical-extractor-documentation) • [Main README](../README.md) • [CLAUDE.md](../CLAUDE.md)

Made with ❤️ for the medical research community

</div>
