# MVP UI Plan

## Goal

Build the learner-facing session first, while keeping the diagnostic logic visible enough to support the later hackathon demo panel.

## First Screen Set

The first version should stay inside one session surface.

### 1. Session Start

- greeting
- available time selection
- short plan announcement

### 2. Review Intro

- one short reminder from the previous weak point

### 3. Main Question Flow

- show one statement at a time
- learner answers with:
  - `○`
  - `×`
  - `わからない`
- return one short feedback line

### 4. Whole Question Check

- reconstruct the full 4-choice question
- learner chooses `1 / 2 / 3 / 4`

### 5. Diagnostic Branch

- if stable, skip to summary
- if not stable, run:
  - diagnostic intro
  - diagnostic question 1
  - diagnostic question 2
  - intervention selection
  - intervention run

### 6. Summary

- today’s weak point
- next focus
- simple pass-likelihood update

## UI Blocks

The session screen should have these blocks:

- top progress strip
- coach message area
- current prompt card
- response action row
- short feedback area
- next-step button

The later demo mode can add one side panel or bottom sheet for:

- current hypothesis
- selected intervention
- state update
- metadata event log

## Minimal Decision Rules To Implement

These are the first rules worth implementing in code for this MVP.

### A. Question mode detection

Detect whether the exam asks:

- `正しいものはどれか`
- `誤っているものはどれか`

This affects branch review wording.

### B. Branch review wording

Keep these states separate:

- final answer correctness
- objective truth of the reviewed statement
- learner belief at answer time

This is essential for accurate feedback.

### C. Session amount decision

Use only:

- available time
- recent weak topic
- current risk level

Output:

- session mode
- question count
- today’s plan sentence

### D. Diagnostic trigger

Trigger the diagnostic branch when:

- branch-level understanding is uneven
- the full 4-choice answer fails despite some correct branch judgments
- `わからない` appears repeatedly

## Files To Create Next

The next implementation step should create:

- `docs/decision-rules.md`
- `docs/openmetadata-entity-map.md`
- `app/session/page` or equivalent single-screen UI entry
- `lib/session-state`
- `lib/decision-rules`
- `lib/demo-events`

## Implementation Notes

- keep naming specific to this project
- keep the logic small and testable
- write fresh copy for this product
- structure the data model so the metadata panel can be added without refactoring the session UI
