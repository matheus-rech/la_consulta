# Documentation Reorganization - Quick Reference

## FILES AT A GLANCE

### KEEP IN ROOT (5 files)
```
✅ README.md                     (117 lines)   - Entry point
✅ CLAUDE.md                     (2,080 lines) - Core AI guide  
✅ MULTI_AGENT_PIPELINE.md       (508 lines)   - Main feature doc
✅ AI_SERVICE_ARCHITECTURE.md    (315 lines)   - Tech reference
```

### MOVE TO DOCS/ (11 files → from root + analysis)
```
📁 BACKEND_INTEGRATION.md        (900 lines)   - CONSOLIDATED (was 3 files)
📁 CITATION_PROVENANCE_SYSTEM.md (600 lines)   - CONSOLIDATED (was 2 files)
📁 EXECUTIVE_SUMMARY.md          (348 lines)   - Move from analysis/
📁 STRATEGIC_RECOMMENDATIONS.md  (298 lines)   - Move from analysis/
📁 ISSUES_AND_PRIORITIES.md      (285 lines)   - Move from analysis/
📁 TECHNICAL_FIXES.md            (550 lines)   - CONSOLIDATED (was 2 files)
📁 MANUAL_TESTING_GUIDE.md       (399 lines)   - Already in docs/
📁 Feature_Verification.md       (379 lines)   - Already in docs/
📁 ARCHITECTURE_MAP.md           (215 lines)   - Move from analysis/
📁 AGENT_PROMPTS_REFERENCE.md    (480 lines)   - Move from root
📁 REGRESSION_FIXES.md           (291 lines)   - Move from root
```

### ARCHIVE (10 files → docs/archive/)
```
📦 PHASE_6_COMPLETE.md           (391 lines)   - Phase docs
📦 PHASE_5_INTEGRATION_NOTES.md   (291 lines)   - Phase docs
📦 PHASE_5_5_COMPLETE.md         (287 lines)   - Phase docs
📦 PHASE_5_4_COMPLETE.md         (253 lines)   - Phase docs
📦 PHASE_4.2_4.3_SUMMARY.md      (256 lines)   - Phase docs
📦 REFACTORING_COMPLETE.md       (515 lines)   - Phase summary
📦 google-sheets-decision.md     (283 lines)   - Decision record
📦 quick-wins.md                 (195 lines)   - Completed tasks
📦 quick-wins-complete.md        (127 lines)   - Task report
📦 VERIFICATION_CHECKLIST.md     (290 lines)   - Specific verification
```

### DELETE (1 file)
```
❌ Bach/README.md                (1 line)      - Placeholder, unused
```

### KEEP IN ORIGINAL LOCATION
```
✅ backend/README.md             (377 lines)   - With backend code
✅ docs/Clinical_Extractor_Improvement_Strategy.md (1,729 lines) - Already in docs/
```

---

## CONSOLIDATION DETAILS

### CONSOLIDATION 1: Integration Docs
**Current (1,126 lines):**
- FRONTEND_BACKEND_INTEGRATION.md (395 lines)
- INTEGRATION_SUMMARY.md (299 lines)
- INTEGRATION_CHECKLIST.md (432 lines)

**→ New (900 lines):**
- docs/BACKEND_INTEGRATION.md
  - Section 1: Overview & security fix
  - Section 2: Architecture & endpoints
  - Section 3: Implementation checklist

**Saves:** 226 lines of duplication

---

### CONSOLIDATION 2: Citation/Provenance Docs
**Current (661 lines):**
- NOBEL_PRIZE_IMPLEMENTATION_PLAN.md (290 lines)
- IMPLEMENTATION_SUMMARY.md (371 lines)

**→ New (600 lines):**
- docs/CITATION_PROVENANCE_SYSTEM.md
  - Section 1: Overview
  - Section 2: Implementation details
  - Section 3: Usage examples

**Saves:** 61 lines of duplication

---

### CONSOLIDATION 3: Technical Docs
**Current (550 lines):**
- typescript-fixes.md (252 lines)
- error-handling-implementation.md (298 lines)

**→ New (550 lines):**
- docs/TECHNICAL_FIXES.md
  - Part 1: TypeScript compilation fixes
  - Part 2: Error handling implementation

**Saves:** Reorg only, no duplication

---

### CONSOLIDATION 4: Analysis Docs
**Current (583 lines across 2 files):**
- top-10-issues.md (285 lines)
- strategic-recommendations.md (298 lines)

**→ New (583 lines):**
- docs/ISSUES_AND_RECOMMENDATIONS.md
  - Part 1: Top 10 issues
  - Part 2: Strategic recommendations

**Saves:** Reorg only, no duplication

---

## NEW DIRECTORY STRUCTURE

```
/
├── README.md
├── CLAUDE.md
├── MULTI_AGENT_PIPELINE.md
├── AI_SERVICE_ARCHITECTURE.md
│
├── docs/
│   ├── README.md (NEW - index)
│   ├── BACKEND_INTEGRATION.md (NEW - consolidated)
│   ├── CITATION_PROVENANCE_SYSTEM.md (NEW - consolidated)
│   ├── EXECUTIVE_SUMMARY.md (moved)
│   ├── STRATEGIC_RECOMMENDATIONS.md (moved)
│   ├── ISSUES_AND_PRIORITIES.md (moved)
│   ├── TECHNICAL_FIXES.md (NEW - consolidated)
│   ├── MANUAL_TESTING_GUIDE.md (existing)
│   ├── Feature_Verification.md (existing)
│   ├── ARCHITECTURE_MAP.md (moved)
│   ├── AGENT_PROMPTS_REFERENCE.md (moved)
│   ├── REGRESSION_FIXES.md (moved)
│   ├── Clinical_Extractor_Improvement_Strategy.md (existing)
│   │
│   └── archive/
│       ├── README.md (NEW - archive index)
│       ├── DECISIONS/
│       │   └── google-sheets-decision.md (moved)
│       └── PHASES/
│           ├── README.md (NEW)
│           ├── PHASE_6_COMPLETE.md (moved)
│           ├── PHASE_5_INTEGRATION_NOTES.md (moved)
│           ├── PHASE_5_5_COMPLETE.md (moved)
│           ├── PHASE_5_4_COMPLETE.md (moved)
│           ├── PHASE_4.2_4.3_SUMMARY.md (moved)
│           ├── REFACTORING_COMPLETE.md (moved)
│           ├── quick-wins.md (moved)
│           ├── quick-wins-complete.md (moved)
│           └── VERIFICATION_CHECKLIST.md (moved)
│
└── backend/
    └── README.md (unchanged)
```

---

## IMPACT ANALYSIS

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Files in Root | 19 | 4 | -74% |
| Files in Docs/ | 3 | 13 | +333% |
| Files in Archive/ | 0 | 11 | +1100% |
| Total Markdown Files | 33 | 32 | -1 (deleted placeholder) |
| Total Lines | 12,662 | ~11,875 | -787 (consolidated) |
| Duplication Removed | - | 287 lines | 2.3% savings |
| Clarity Score | Medium | High | Better organized |

---

## IMPLEMENTATION STEPS (Estimated 3-4 hours)

### Phase 1: Setup (15 min)
- [ ] Create `/docs/archive/` directory
- [ ] Create `/docs/archive/PHASES/` directory
- [ ] Create `/docs/archive/DECISIONS/` directory

### Phase 2: Consolidate (90 min)
- [ ] Consolidate FRONTEND_BACKEND_INTEGRATION.md + INTEGRATION_SUMMARY.md → docs/BACKEND_INTEGRATION.md
- [ ] Consolidate NOBEL_PRIZE + IMPLEMENTATION_SUMMARY.md → docs/CITATION_PROVENANCE_SYSTEM.md
- [ ] Consolidate typescript-fixes + error-handling → docs/TECHNICAL_FIXES.md
- [ ] Consolidate top-10-issues + strategic-recommendations → docs/ISSUES_AND_RECOMMENDATIONS.md

### Phase 3: Move Files (45 min)
- [ ] Move AGENT_PROMPTS_REFERENCE.md to docs/
- [ ] Move REGRESSION_FIXES.md to docs/
- [ ] Move EXECUTIVE-SUMMARY.md to docs/ (from analysis/)
- [ ] Move remaining analysis/*.md files to docs/
- [ ] Move google-sheets-decision.md to docs/archive/DECISIONS/
- [ ] Move all PHASE_*.md to docs/archive/PHASES/
- [ ] Move quick-wins*.md to docs/archive/

### Phase 4: Create Indexes (30 min)
- [ ] Create docs/README.md (documentation index)
- [ ] Create docs/archive/README.md (archive index)
- [ ] Create docs/archive/PHASES/README.md (phases index)

### Phase 5: Delete & Update (15 min)
- [ ] Delete Bach/README.md
- [ ] Update ROOT README.md links
- [ ] Update CLAUDE.md links if needed

### Phase 6: Commit (5 min)
- [ ] Commit with: `docs: reorganize documentation for clarity`
- [ ] Push to remote

---

## QUICK DECISION MATRIX

**Keep in Root?**
```
YES:  README.md, CLAUDE.md, MULTI_AGENT_PIPELINE.md, AI_SERVICE_ARCHITECTURE.md
NO:   Everything else
```

**Consolidate?**
```
YES:  
  - FRONTEND_BACKEND_INTEGRATION.md + INTEGRATION_SUMMARY.md
  - NOBEL_PRIZE_IMPLEMENTATION_PLAN.md + IMPLEMENTATION_SUMMARY.md
  - typescript-fixes.md + error-handling-implementation.md
  - top-10-issues.md + strategic-recommendations.md
NO:   Other files
```

**Archive?**
```
YES:  All PHASE_*.md, quick-wins*.md, REFACTORING_COMPLETE.md, google-sheets-decision.md, VERIFICATION_CHECKLIST.md
NO:   Active documentation
```

**Delete?**
```
YES:  Bach/README.md (placeholder only)
NO:   Everything else
```

---

## FILES SUMMARY BY TYPE

### Core Documentation (Keep in Root)
- Entry point & architect guide: README.md, CLAUDE.md
- Main features: MULTI_AGENT_PIPELINE.md, AI_SERVICE_ARCHITECTURE.md

### Active Reference (Move to Docs/)
- System assessment: EXECUTIVE_SUMMARY.md, Strategic recommendations
- Developer guides: MANUAL_TESTING_GUIDE.md, ARCHITECTURE_MAP.md
- Technical references: AGENT_PROMPTS_REFERENCE.md, API guides
- Problem tracking: Issues & Recommendations

### Historical Records (Archive)
- Phase documentation: 6 files (phases 4-6)
- Completed tasks: quick-wins reports (2 files)
- Decision records: google-sheets decision
- Specific verification: Verification checklists

---

## SUCCESS CRITERIA

After reorganization, you should have:

✅ Clean root directory with only 4 core files  
✅ Well-organized docs/ folder with 13 files  
✅ Archive/ with 11 historical documents  
✅ No lost information (everything preserved or consolidated)  
✅ Reduced duplication (287 lines)  
✅ Better navigation (clear indexes)  
✅ Clear relationships between documents

