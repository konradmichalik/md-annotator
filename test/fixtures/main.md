# Main Document

This is the main test document for multi-file support. It exercises all major features of the annotation interface: text selection, deletions, comments, linked navigation between files, image and diagram annotations, code blocks, and tables.

## Quick Links

- [API Documentation](./docs/api.md) - REST API reference
- [User Guide](./docs/guide.md) - Getting started guide
- [External Link](https://example.com) - Should open in new browser tab

## Overview

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.

### Features

- **Multi-file review** — open multiple files in one session
- **Linked navigation** — click `.md` links to open them as tabs
- **Tab bar** — switch between files with annotation count badges
- **Per-file undo/redo** — each file has its own history

## Screenshot

Here is a preview of the annotation interface:

![Annotation UI](./assets/placeholder-wide.svg)

You can also see inline images like this: The logo ![Logo](./assets/placeholder-icon.svg) appears next to the title.

## Architecture

```mermaid
graph TD
    A[CLI Entry] -->|validates files| B[Express Server]
    B -->|serves| C[React SPA]
    C -->|text selection| D[web-highlighter]
    D --> E{Annotation Type}
    E -->|Cmd+D| F[Deletion]
    E -->|Cmd+K| G[Comment]
    F --> H[Annotation Store]
    G --> H
    H -->|POST /api/feedback| B
    B -->|stdout| I[AI Agent]
```

## Sequence Diagram

```plantuml
@startuml
actor User
participant "Browser" as B
participant "Express Server" as S
participant "AI Agent" as AI

User -> B: Open markdown file
B -> S: GET /api/files
S --> B: File content + config
User -> B: Select text & annotate
B -> S: POST /api/annotations
User -> B: Click "Submit Feedback"
B -> S: POST /api/feedback
S --> AI: Structured feedback (stdout)
@enduml
```

## Class Diagram

```plantuml
@startuml
class Viewer {
  +blocks: Block[]
  +annotations: Annotation[]
  +render()
  +restoreHighlights()
}

class AnnotationPanel {
  +annotations: Annotation[]
  +onSelect(id)
  +onDelete(id)
}

class MermaidBlock {
  +block: Block
  +svg: string
  +render()
}

class PlantUMLBlock {
  +block: Block
  +serverUrl: string
  +fetchSvg()
}

Viewer --> MermaidBlock
Viewer --> PlantUMLBlock
Viewer --> AnnotationPanel
@enduml
```

## Code Example

```javascript
const server = await createServer(['file1.md', 'file2.md'])
const decision = await server.waitForDecision()
```

## Table Test

| Feature         | Status      |
|-----------------|-------------|
| Multi-file CLI  | Implemented |
| Tab bar         | Implemented |
| Linked nav      | Implemented |
| Path security   | Implemented |

## Notes

This paragraph contains some text you can **annotate for testing**. Try selecting different portions and marking them as deletions or adding comments.

> This blockquote can also be annotated. Try selecting just part of it.

---

See also the [API docs](./docs/api.md) for more details.
