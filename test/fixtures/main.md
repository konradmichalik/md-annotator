---
title: Main Document
status: draft
created: 2026-01-15
updated: 2026-03-17
complexity: medium
---

<div align="center">
  <img src="./assets/placeholder-icon.svg" alt="Logo" width="80" height="80">

# Main Document

**A test document for the annotation interface.**

[![Badge One](https://img.shields.io/badge/status-active-brightgreen)](https://example.com)
[![Badge Two](https://img.shields.io/badge/version-1.0-blue)](https://example.com)
[![Badge Three](https://img.shields.io/badge/license-MIT-green)](https://example.com)

</div>

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
- **Per-file undo/redo** — ~~each file has its own history~~

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

## Kroki Diagrams

```graphviz
digraph G {
    rankdir=LR
    node [shape=box, style=filled, fillcolor="#4c566a", fontcolor="#eceff4"]
    edge [color="#81a1c1"]

    CLI -> Server -> Browser
    Browser -> Server [label="feedback"]
    Server -> Agent [label="stdout"]
}
```

```d2
direction: right
CLI -> Server -> Browser
Browser -> Server: feedback
Server -> Agent: stdout
```

```ditaa
+--------+   +--------+   +---------+
|  CLI   +-->+ Server +-->+ Browser |
+--------+   +---+----+   +---------+
                 |
                 v
             +--------+
             | Agent  |
             +--------+
```

## ER Diagram (Wide)

```mermaid
erDiagram
    Project ||--o{ Task : "has tasks"
    Project ||--o{ Milestone : "has milestones"
    Project }o--o{ TeamMember : "has members"
    Project ||--o{ Document : "has documents"
    Project |o--o| Client : "belongs to"
    Project |o--o| Category : "categorized as"
    Project ||--o{ TimeEntry : "tracks time"
    Project ||--o{ Invoice : "billed via"
    Project ||--o{ Comment : "has comments"

    Milestone ||--o{ Task : "contains tasks"
    Milestone |o--o| TeamMember : "owned by"

    Task ||--o{ TimeEntry : "tracks time"
    Task }o--o{ Tag : "tagged with"
    Task |o--o| TeamMember : "assigned to"
    Task ||--o{ Comment : "has comments"
    Task ||--o{ Attachment : "has files"

    Invoice ||--|{ InvoiceLineItem : "contains"
    InvoiceLineItem }o--o| Task : "references"

    Project {
        string id PK
        string name
        string description
        enum status
        date startDate
        date endDate
        decimal budget
        decimal spent
        float progress
        int taskCount
        int openIssues
        boolean isArchived
        boolean isPublic
        string repository
        text notes
    }

    Task {
        string id PK
        string title
        text description
        enum status
        enum priority
        date dueDate
        date completedAt
        int estimatedHours
        int actualHours
        boolean isBlocked
        text acceptanceCriteria
    }

    Milestone {
        string id PK
        string title
        date dueDate
        enum status
        float progress
        int taskCount
    }

    TeamMember {
        string id PK
        string name
        string email
        string avatar
        enum role
        text bio
        decimal hourlyRate
    }

    Client {
        string id PK
        string companyName
        string contactName
        string email
        string phone
        text address
        string taxId
    }

    TimeEntry {
        string id PK
        date date
        int minutes
        text description
        boolean isBillable
    }

    Invoice {
        string id PK
        string number
        date issuedAt
        date dueDate
        enum status
        decimal subtotal
        decimal tax
        decimal total
        string currency
    }

    InvoiceLineItem {
        string id PK
        string description
        int quantity
        decimal unitPrice
        decimal amount
    }

    Document {
        string id PK
        string title
        enum type
        string url
        date uploadedAt
        int sizeBytes
    }

    Comment {
        string id PK
        text body
        date createdAt
        string authorId
    }

    Tag {
        string id PK
        string name
        string color
    }

    Category {
        string id PK
        string name
        text description
        int projectCount
    }

    Attachment {
        string id PK
        string filename
        string mimeType
        int sizeBytes
        date uploadedAt
    }
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

## Color Palette

The primary brand color is `#5e81ac` (Nord blue), with `#88c0d0` as a secondary accent. Error states use `#bf616a` and success indicators use `#a3be8c`.

Short-hand hex codes like `#333`, `#fff`, and `#f06` are also supported. Colors with alpha channel work too: `#5e81ac80` renders at 50% opacity.

These should NOT show swatches: `#header`, `#section-1`, `background-color: #5e81ac`.

## Inline Extras Test

### Autolinks

Visit https://example.com for more info. Multiple URLs: https://github.com/user/repo and https://docs.example.com/path?q=1&v=2.

Contact support@example.com or admin@test.org for help.

A URL at end of sentence: https://example.com.

### Emoji Shortcodes

:rocket: Launch day! :tada: :sparkles:

:warning: Be careful with :fire: hot code paths.

:thumbsup: Approved :check: — :thumbsdown: Rejected :x:

Code span with colon: `:not-an-emoji:` should stay literal.

### Smart Punctuation

"Smart quotes" and 'single quotes' work automatically.

Use an em dash---like this---for emphasis. Or an en dash for ranges: 10--20.

Trailing off... with an ellipsis.

Code spans preserve punctuation: `"not smart"` and `don't---convert`.

## Wide Table Test

| ID | Feature | Status | Owner | Priority | Sprint | Estimate | Actual | Notes |
|----|---------|--------|-------|----------|--------|----------|--------|-------|
| 1 | Multi-file CLI | Done | Alice | High | 1 | 3d | 2d | Shipped in v0.8 |
| 2 | Tab bar | Done | Bob | High | 1 | 2d | 3d | Required redesign |
| 3 | Linked nav | Done | Alice | Medium | 2 | 1d | 1d | Uses React Router |
| 4 | Table popout | In Progress | Charlie | Low | 4 | 1d | — | New feature |
| 5 | Copy table | In Progress | Charlie | Low | 4 | 0.5d | — | MD + CSV export |

## Security Test

This section tests that dangerous HTML is sanitized:

<div onclick="alert('xss')">Click me (onclick should be stripped)</div>

<img src="x" onerror="alert('xss')" alt="XSS test">

<p style="background: url('javascript:alert(1)')">Styled paragraph (style should be stripped)</p>

## Notes

This paragraph contains some text you can **annotate for testing**. Try selecting different portions and marking them as deletions or adding comments.

> This blockquote can also be annotated. Try selecting just part of it.

---

See also the [API docs](./docs/api.md) for more details.
