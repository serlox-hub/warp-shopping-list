# Create Structured GitHub Issue

You are tasked with creating a highly structured GitHub issue for the Pocuo shopping list project.

## Process

1. **Gather Information**: Ask the user questions to understand the task completely:
   - What is the main goal or feature to implement?
   - What problem does this solve for users?
   - Are there any specific technical requirements or constraints?
   - What parts of the codebase will be affected? (components, services, database, etc.)
   - Are there any dependencies or prerequisites?
   - What is the expected priority or urgency?
   - Any additional context or considerations?

2. **Analyze and Structure**: Based on the user's answers:
   - Evaluate the complexity and scope of the task
   - Identify which parts of the architecture are involved
   - Consider testing requirements
   - Think about potential edge cases and challenges
   - Assess impact on existing functionality

3. **Generate Issue**: Create a comprehensive GitHub issue with the following structure:

## Issue Template

```markdown
## 📋 Overview

[Brief description of what needs to be done and why it matters for users]

## 🎯 Objective

[Clear, concise statement of the goal]

## 📊 Project Evaluation

### Complexity: [Low/Medium/High]
[Analysis of technical complexity, affected systems, and required expertise]

### Affected Areas:
- [ ] Database Schema
- [ ] Backend Services
- [ ] Frontend Components
- [ ] Authentication/Authorization
- [ ] Internationalization (i18n)
- [ ] Styling/Theme
- [ ] Testing
- [ ] Documentation

### Technical Considerations:
- [List key technical challenges or decisions]
- [Potential risks or blockers]
- [Dependencies on other systems or features]

## 🗺️ Implementation Plan

### Phase 1: [Foundation/Preparation]
**Goal**: [What this phase achieves]

**Milestones** (atomic commits):
1. **[Commit 1 description]**
   - What: [Specific change]
   - Why: [Reason for this step]
   - Files: [Affected files]

2. **[Commit 2 description]**
   - What: [Specific change]
   - Why: [Reason for this step]
   - Files: [Affected files]

### Phase 2: [Core Implementation]
**Goal**: [What this phase achieves]

**Milestones** (atomic commits):
1. **[Commit 1 description]**
   - What: [Specific change]
   - Why: [Reason for this step]
   - Files: [Affected files]

2. **[Commit 2 description]**
   - What: [Specific change]
   - Why: [Reason for this step]
   - Files: [Affected files]

### Phase 3: [Polish/Testing/Documentation]
**Goal**: [What this phase achieves]

**Milestones** (atomic commits):
1. **[Commit 1 description]**
   - What: [Specific change]
   - Why: [Reason for this step]
   - Files: [Affected files]

2. **[Commit 2 description]**
   - What: [Specific change]
   - Why: [Reason for this step]
   - Files: [Affected files]

## ✅ Definition of Done

### Functionality:
- [ ] Feature works as described in all scenarios
- [ ] Edge cases are handled gracefully
- [ ] Error states provide clear feedback
- [ ] Works in both English and Spanish
- [ ] Works in light and dark mode
- [ ] Responsive on mobile and desktop

### Code Quality:
- [ ] Follows existing project patterns and architecture
- [ ] Service layer pattern maintained (no direct Supabase calls in components)
- [ ] DRY principle applied - no unnecessary duplication
- [ ] Clear, self-documenting code with meaningful names
- [ ] Proper error handling and loading states
- [ ] No console errors or warnings

### Testing:
- [ ] Unit tests added for new functionality
- [ ] Integration tests for service layer if applicable
- [ ] Component tests for UI changes
- [ ] All existing tests pass
- [ ] Code coverage maintained at 88%+
- [ ] Manual testing completed in browser

### Build & Quality Checks:
- [ ] `npm run build` completes without errors
- [ ] `npm run lint` passes with no warnings
- [ ] `npm test` passes all tests
- [ ] TypeScript types are correct (no `any` types unless justified)

### Accessibility & UX:
- [ ] Keyboard navigation works
- [ ] ARIA labels added where appropriate
- [ ] Semantic HTML used
- [ ] Focus states are visible
- [ ] Screen reader friendly

### Documentation:
- [ ] Code comments added for complex logic
- [ ] Translation keys added to both `en.json` and `es.json`
- [ ] Database schema changes documented if applicable
- [ ] README or relevant docs updated if needed

### Long-term Maintainability:
- [ ] Code is structured for easy future modifications
- [ ] No technical debt introduced (or explicitly documented if unavoidable)
- [ ] Performance considerations addressed
- [ ] Security best practices followed (OWASP guidelines)

## 🎯 Project-Specific Requirements

**CRITICAL**: This implementation must prioritize:
- ✅ **Long-term maintainability** over speed of delivery
- ✅ **Proper file structure** following existing architecture
- ✅ **Software engineering best practices** (SOLID, DRY, Clean Code)
- ✅ **Code quality** over quick hacks
- ✅ **Comprehensive testing** before considering done
- ✅ **Architectural consistency** with existing patterns

**Follow the Test-Driven Development workflow**:
1. Write/update tests first
2. Implement the feature
3. Run `npm test` (all tests must pass)
4. Run `npm run build` (build must succeed)
5. Perform self-review before marking as complete

## 📝 Additional Notes

[Any extra context, links to resources, design mockups, related issues, etc.]
```

## Important Guidelines

- **Ask clarifying questions** - Don't assume, get complete information
- **Be thorough** - Each phase should have specific, actionable milestones
- **Atomic commits** - Each milestone should be a small, complete change
- **Realistic evaluation** - Accurately assess complexity and scope
- **Context-aware** - Reference specific files and patterns from the Pocuo codebase
- **Quality-focused** - Emphasize maintainability and best practices in every section

## After Creating the Issue

Once you've generated the issue content:
1. Show it to the user for review
2. Offer to create it directly using `gh issue create` if they approve
3. Or provide the markdown for them to create manually

Now, begin by asking the user questions to understand the task they want to create an issue for.
