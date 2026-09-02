# Realistic Map Stories Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add real DEM-derived terrain, evidence-backed story points, and person-event cards to the existing Long March map.

**Architecture:** Keep MapLibre and the existing node/route model. Add story data as validated JSON, render story markers as a separate map layer, and extend the shared right panel with a story view. Generate terrain assets with the existing preprocessing script so the prototype remains usable without a third-party basemap.

**Tech Stack:** React 18, TypeScript, Vite, MapLibre GL, Node built-in test runner, PNGJS.

**Spec:** docs/superpowers/specs/2026-09-02-realistic-map-stories-design.md

## Global Constraints

- Do not add dependencies.
- Do not use AI-generated historical portraits or invented quotations.
- Every story must reference an existing source ID.
- Route uncertainty labels remain visible and unchanged.
- DEM-derived terrain must be described as reconstruction, not route evidence.
- Preserve mobile and reduced-motion behavior.

## Task 1: Validate the story data contract

- Create app/scripts/story-data.test.mjs.
- Run the test and confirm it fails because app/src/data/stories.json is absent.
- Create app/src/data/stories.json with at least 12 evidence-backed events.
- Require unique IDs, valid coordinates, people or participant groups, existing source IDs, and explicit precision.
- Run the test and confirm it passes.

## Task 2: Generate local terrain products

- Run npm run terrain.
- Verify hillshade.png, hillshade-bbox.json, and elevation-profiles.json.
- Adjust app/src/map/style.ts so terrain is legible without obscuring routes and rivers.
- Run npm run build.

## Task 3: Render story markers

- Modify app/src/map/MapCanvas.tsx, app/src/App.tsx, and app/src/components/Legend.tsx.
- Import story JSON with an explicit TypeScript type.
- Create markers after map load and synchronize selected and visible states.
- Add an “沿途故事” checkbox to the legend.
- Selecting a story opens its drawer and stops automatic playback.

## Task 4: Add story and person-event cards

- Extend RightView with a story view.
- Modify app/src/components/RightPanel.tsx and app/src/styles.css.
- Render time, place, precision, category, summary, people roles, question, and source links.
- Add a control returning to the story’s teaching node.
- Verify desktop and 390×844 layouts.

## Task 5: Verification

- Run node --test scripts/story-data.test.mjs.
- Run npm run build.
- Run node ../scripts/validate-prep.mjs.
- Capture desktop and mobile screenshots.
- Confirm terrain, routes, story markers, and story drawer are readable.

## Task 6: Generate scalable contours

- Add failing tests for contour outputs and style integration.
- Extend build-terrain.mjs with dependency-free marching-squares contour generation.
- Produce contour-200.geojson, contour-100.geojson, and contour-50.geojson.
- Add zoom-dependent line and elevation-label layers.

## Task 7: Increase exploration freedom

- Add navigation, compass, pitch, and scale controls to MapLibre.
- Add a compact layer panel with independent visibility toggles.
- Stop moving the camera when a story is selected.
- Expose route hover information and map interaction status.

## Task 8: Reduce marker density and add feedback

- Scale node and story markers by zoom.
- Hide labels at overview zoom unless selected or hovered.
- Add selected-story ripple, route hover emphasis, panel entry motion, and reduced-motion fallbacks.
- Verify desktop, mobile, keyboard, and touch behavior.
