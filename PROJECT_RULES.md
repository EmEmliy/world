# Project Rules

This file is the mandatory operating rulebook for any model or agent working in this repository.

Read this file first before making any code changes.

## Quick Start

If you are another model taking over this project, do this in order:

1. Read this file completely.
2. Read only the files directly related to the current task.
3. Make the smallest possible change.
4. Run `npm run build`.
5. Report changed files, what changed, and remaining risk.

Do not start with broad optimization or refactoring.

## Chinese Summary

- 当前主页面是 `/xuhui-island`，不是旧的 `/island`
- 这是一个已经手工精修很多轮的项目，不要重做，只能增量微调
- 店铺坐标、龙虾动线、音效开关都很脆弱，改一个地方要检查联动
- 店铺内白噪音固定使用 `public/restaurant.mp3`
- 如果不确定，就停下来，不要猜

## Project Identity

- Main active experience:
  - `/xuhui-island`
- Main shop detail route:
  - `/xuhui-island/shop/[shopId]`
- Legacy demo route that should not be touched unless explicitly requested:
  - `/island`

This repository currently contains both old demo pages and the newer Xuhui/Jinyang island experience. Most ongoing work is on the newer experience.

## Main Files

- Homepage:
  - `src/app/xuhui-island/page.tsx`
- Shop detail page:
  - `src/app/xuhui-island/shop/[shopId]/page.tsx`
- Shop config:
  - `src/config/xuhui-shops.ts`
- Shop interior scenes:
  - `public/xuhui-scenes/`
- Map background:
  - `public/xuhui-island/map-bg.png`
  - `public/xuhui-island/map-bg.mp4`
- Clean building assets:
  - `public/xuhui-island-clean/`
- Store interior white-noise audio:
  - `public/restaurant.mp3`

## Non-Negotiable Rules

1. Do not modify `/island` unless the task explicitly says to touch the legacy page.
2. Do not replace or reset manually tuned store positions.
3. Do not freely refactor layout, routing, or state management.
4. Do not change unrelated pages while fixing one page.
5. Do not remove existing interactions unless explicitly requested.
6. Do not invent new visual directions; preserve the current island/game style.
7. Do not switch asset filenames or move assets unless required by the task.
8. Do not assume older coordinates are correct; current homepage placement depends on the latest `mapOffsetX` / `mapOffsetY` values.
9. Any lobster dispatch or auto-movement logic must use the latest live store positioning, not stale hardcoded marker coordinates.
10. All manual edits must be minimal and reversible.

## Homepage Rules

The homepage is the map experience at `/xuhui-island`.

- The source of truth for store placement is:
  - `src/config/xuhui-shops.ts`
- Store visual position depends on:
  - `x`
  - `y`
  - `mapOffsetX`
  - `mapOffsetY`
  - `mapScale`
- Do not treat `lobsterX` / `lobsterY` as the only visual anchor for dispatched lobster placement.
- If changing lobster movement or dispatch behavior, keep alignment with the current store positions on the map.
- If changing labels, smoke, hover cards, or building sizes, preserve the existing Q-version game map look.
- If changing homepage sound behavior:
  - right-top button should behave as a true toggle
  - default behavior should stay consistent with current product decision
  - do not silently remove the sound control

## Shop Detail Rules

The shop detail experience is at `/xuhui-island/shop/[shopId]`.

- Interior white-noise audio must use:
  - `public/restaurant.mp3`
- Do not switch shop white-noise back to remote demo audio.
- Keep the current two-scene structure:
  - kitchen
  - hall
- Keep the current actor system:
  - guests
  - staff
  - owner
- Owner labels must remain visibly marked as owner/boss where already implemented.
- If modifying chat behavior, do not duplicate messages or append the same assistant reply twice.
- If modifying chat, first check whether the page is using:
  - local simulated reply logic
  - or real `/api/chat`
- Do not assume the page already calls the real MiniMax route; verify in code first.

## Visual Consistency Rules

- Treat this as a live iterative design, not a greenfield rewrite.
- Prefer small consistency fixes over “better” redesigns.
- Keep spacing, borders, shadows, glass panels, and chip styles coherent with nearby UI.
- If you adjust one label style, check matching labels on the same page.
- If you adjust one sound button, check matching sound button on the other page.

## Allowed Optimization Types

Good tasks:

- layout alignment
- responsive scaling
- store position micro-adjustments
- lobster movement and target corrections
- label styling consistency
- sound toggle fixes
- scene overlay cleanup
- action panel hierarchy cleanup
- small copy changes

Bad tasks unless explicitly requested:

- global refactor
- routing overhaul
- API protocol redesign
- switching frameworks
- replacing the visual system
- deleting existing pages
- moving many assets around

## Required Workflow

For every task:

1. Read this file first.
2. Read only the files relevant to the requested task.
3. Make the smallest change that solves the task.
4. Run build validation:
   - `npm run build`
5. Report:
   - changed files
   - what changed
   - whether build passed
   - any remaining risk

## Strongly Recommended Prompt

Use this wording when another model starts working on the repo:

```text
Before making any changes:
1. Read /Users/a1/Desktop/opencode/world/PROJECT_RULES.md
2. Then read only the files directly related to the current task
3. Do not edit anything until you understand the current implementation

Rules:
- Only make minimal, task-scoped changes
- Do not touch /island unless explicitly requested
- Do not reset manually tuned positions
- Do not add extra improvements outside the task
- Must run npm run build after changes

Then complete only this task:
[replace with actual task]
```

## Autonomous Iteration Rules

If asked to optimize for multiple rounds without supervision:

1. Only do small incremental improvements.
2. One round should target one narrow problem.
3. After each round:
   - build
   - summarize
   - commit
4. Stop instead of guessing if the next optimization would require broad redesign or uncertain product decisions.

## Git Safety

- Commit frequently.
- Use clear commit messages.
- Do not rewrite history.
- Do not reset user changes.
- Do not revert unrelated files.

## Prompting Guidance For Other Models

Recommended instruction:

1. Read `PROJECT_RULES.md` first.
2. Read only task-relevant files.
3. Apply minimal changes only.
4. Run `npm run build`.
5. Summarize files changed and risks.

## Current Known Reality

- Homepage deployment route in product work is `/xuhui-island`, not `/island`.
- Store placement has already been manually fine-tuned many times.
- The map background video was compressed for deployment size limits.
- Shop detail page currently mixes UI polish work with simulated chat logic; verify before changing.
- Sound behavior is a recurring fragile area; test it after every sound-related change.
