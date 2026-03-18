# Task Brief Template

Use this file as the per-task handoff when asking another model to work on this project.

Copy this template, fill in the current task, and give it to the model together with `PROJECT_RULES.md`.

## How To Use

1. Keep `PROJECT_RULES.md` unchanged as the long-term rulebook.
2. Rewrite only the `Current Task` section below for each new request.
3. Give both files to the other model.
4. Ask it to follow the prompt at the bottom exactly.

Chinese reminder:

- `PROJECT_RULES.md` 管长期规则
- `TASK_BRIEF.md` 管这一次具体要做什么
- 每次任务都只改 `Current Task`

---

## Required Start

Before doing anything:

1. Read:
   - `/Users/a1/Desktop/opencode/world/PROJECT_RULES.md`
2. Then read only the files directly related to this task.
3. Do not modify code until you understand the current implementation.

## Hard Constraints

- Only modify files directly related to this task.
- Do not touch `/island` unless explicitly requested.
- Do not reset or replace manually tuned positions.
- Do not do broad refactors.
- Do not add “extra improvements” outside the task scope.
- After changes, must run:
  - `npm run build`

## Current Task

Describe the task here.

Example format:

- Goal:
  - Fix homepage lobster dispatch target alignment for `锦府园`
- Scope:
  - `src/app/xuhui-island/page.tsx`
  - `src/config/xuhui-shops.ts`
- Do not touch:
  - `src/app/island/page.tsx`
  - shop detail page

## Deliverable Requirements

At the end, report:

- Files changed
- What changed in each file
- Why the change fixes the problem
- Build result
- Any remaining known issue

## If Running Autonomous Multi-Round Optimization

Only use this section if the model is asked to improve the project for several rounds without supervision.

- Maximum rounds:
  - 3
- Each round must:
  - solve one narrow problem
  - run build
  - summarize result
  - commit once
- Stop early if:
  - next step would require guessing product intent
  - next step would require broad redesign
  - build cannot be stabilized

## Safe Prompt To Give Another Model

Use this prompt:

```text
You are working on this project:
/Users/a1/Desktop/opencode/world

Before making any changes:
1. Read /Users/a1/Desktop/opencode/world/PROJECT_RULES.md
2. Then read only the files directly related to this task
3. Do not start editing until you understand the existing implementation

Rules:
- Only do minimal changes
- Do not touch unrelated files
- Do not modify /island unless explicitly required
- Do not reset tuned positions or visual rules
- Do not do broad refactors
- Must run npm run build after changes

Current task:
[replace with your actual task]

Final output must include:
- files changed
- what changed
- why
- build result
- remaining risk
```
