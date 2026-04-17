README

# Metadata-Driven AI Coach for 管理業務主任者

A hackathon project that rethinks certification learning.

Traditional prep often relies on memorization volume or one-shot Q&A tools.  
This system acts like a real coach: it diagnoses why a learner struggles, chooses the next best intervention, updates learner state, and explains progress through metadata.

---

# Vision

Good coaches don’t explain first.  
They diagnose first.

We are building an AI coaching system that helps learners build transferable understanding — not just collect correct answers.

The goal is stronger comprehension, higher retention, and better exam performance.

---

# Problem

Many certification learners face the same issues:

- They solve many questions but don’t know *why* they are wrong
- Correct answers may come from guessing or elimination
- Weak areas stay hidden
- Generic AI explains answers, but does not guide strategy
- Mobile learning apps often overload users with dense screens

For the Property Management Administrator exam, this is especially painful because success requires:

- legal principles
- distinction between similar concepts
- reading precision
- consistent review over time

---

# Solution

We built a metadata-driven diagnostic coach.

Instead of only grading answers, the system runs this loop:

Ideal State  
↓  
Current State  
↓  
Gap Detection  
↓  
Hypothesis Generation  
↓  
Diagnostic Quiz  
↓  
Best Intervention  
↓  
Outcome Measurement  
↓  
(Future) Coach Learns

The coach continuously decides what the learner needs next.

---

# Core Experience

## Single Session Interface

The product is designed as a live coaching session, not a multi-screen app.

Like sitting with a real tutor in a cafe:

- The coach greets you
- Asks available time
- Sets today’s plan
- Reviews previous mistakes
- Guides the next question
- Adjusts based on responses
- Summarizes progress

## One Choice at a Time

Instead of showing a dense 4-choice question immediately:

1. Show one statement at a time  
2. Learner answers:  
   - ○ Correct  
   - × Incorrect  
   - ? I don’t know  
3. Give short feedback  
4. Repeat for all four statements  
5. Rebuild into one full exam-style question

This reduces cognitive load while preserving exam readiness.

---

# Why This Matters

A correct 4-choice answer does not always mean real understanding.

The learner may have guessed, used elimination, or misunderstood part of the logic.

By analyzing each statement separately, we can detect:

- principle misunderstanding
- memory gaps
- reading mistakes
- comparison weakness
- false confidence

---

# Learner State Modeling

The system maintains a dynamic learner profile.

Examples:

- topic mastery
- weak topics
- recent accuracy
- retention level
- reading weakness
- option comparison weakness
- motivation state
- estimated pass likelihood

---

# Hypothesis Engine

When a learner fails, the system generates likely causes.

Examples:

- misunderstanding of legal principle
- reading error
- memory gap
- confusion between similar rules
- weak comparison across options

---

# Diagnostic Layer

The coach does not stop at guesses.

It validates hypotheses using short follow-up quizzes.

Examples:

- Does changing shared property always require unanimous consent?
- What is the difference between invalid and cancellable acts?

---

# Adaptive Intervention Engine

Based on diagnosis, the coach chooses the best next action.

Examples:

- statute review
- concept reinforcement
- similar practice question
- reading drill
- easy win question for confidence recovery

---

# Metadata Layer (OpenMetadata)

Every learning interaction becomes explainable data.

We use OpenMetadata to organize and visualize:

- Questions
- Topics
- Learner State
- Question Exposures
- Hypotheses
- Diagnostic Results
- Interventions
- Progress History

The interface stays simple.  
The intelligence lives underneath.

---

# Architecture

## Frontend
- Mobile-first coaching session UI
- Single-page conversational flow
- Fast interactions
- Minimal friction

## Backend
- Existing Supabase assets reused
- Session state persistence
- Learner progress storage

## Intelligence Layer
- Rule-based + AI-assisted hypothesis generation
- Adaptive next-step selection
- Pass likelihood estimation

## Metadata Layer
- OpenMetadata for explainability and relationships

---

# MVP Scope (Hackathon Version)

## Included

- Start coaching session
- Ask available time
- Review previous weakness
- Present one statement at a time
- O / X / ? responses
- Rebuild into full 4-choice question
- Generate failure hypothesis
- Run mini diagnostic quiz
- Choose best intervention
- Update learner state
- Show simple pass likelihood
- Visualize metadata in OpenMetadata

## Not Included

- Payments
- Multi-user organization features
- Native mobile app
- LINE integration
- Full autonomous coach learning loop

---

# Demo Flow

1. Start session  
2. Coach asks available time  
3. Quick review from previous session  
4. New exam question begins  
5. Four statements answered one by one  
6. Full 4-choice review  
7. Learner struggles  
8. Diagnostic mini quiz  
9. Coach selects intervention  
10. Progress summary  
11. Updated pass likelihood shown

---

# Future Vision

- Coach learns which interventions work best
- Long-term personalized study plans
- Multi-learner support
- LINE / mobile integrations
- Subscription model
- Cross-certification expansion

---

# Core Message

Simple on the surface.  
Intelligent underneath.

We don’t just show questions.  
We build a coach.