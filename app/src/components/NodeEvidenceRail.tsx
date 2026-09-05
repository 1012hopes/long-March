import type { FocusEvent } from "react";
import type { NodeUnit } from "../data/nodes";
import { getStoryMarkerPresentation } from "../map/markerPresentation";
import {
  buildNodeEvidenceRailModel,
  LEARNING_EMPHASIS_OPTIONS,
  type LearningEmphasis,
  type LearningEmphasisKey,
} from "./nodeLearning";

type ToolbarProps = {
  activeEmphasis: LearningEmphasis;
  className?: string;
  onEmphasisChange: (value: LearningEmphasis) => void;
};

type Props = ToolbarProps & {
  node: NodeUnit;
  onSelectStory: (storyId: string) => void;
};

function handleEmphasisBlur(
  event: FocusEvent<HTMLElement>,
  onEmphasisChange: (value: LearningEmphasis) => void
) {
  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
    onEmphasisChange(null);
  }
}

function toggleEmphasis(
  activeEmphasis: LearningEmphasis,
  nextEmphasis: LearningEmphasisKey,
  onEmphasisChange: (value: LearningEmphasis) => void
) {
  onEmphasisChange(activeEmphasis === nextEmphasis ? null : nextEmphasis);
}

export function LearningEmphasisToolbar({ activeEmphasis, className, onEmphasisChange }: ToolbarProps) {
  return (
    <div className={["learning-emphasis-toolbar", className].filter(Boolean).join(" ")} role="group" aria-label="地图联动强调">
      {LEARNING_EMPHASIS_OPTIONS.map((option) => {
        const active = activeEmphasis === option.id;
        return (
          <button
            key={option.id}
            type="button"
            className={`learning-emphasis-btn ${active ? "active" : ""}`}
            aria-pressed={active}
            onClick={() => toggleEmphasis(activeEmphasis, option.id, onEmphasisChange)}
            onFocus={() => onEmphasisChange(option.id)}
            onBlur={(event) => handleEmphasisBlur(event, onEmphasisChange)}
            title={option.hint}
          >
            <span>{option.label}</span>
            <small>{option.hint}</small>
          </button>
        );
      })}
    </div>
  );
}

export default function NodeEvidenceRail({
  node,
  activeEmphasis,
  onEmphasisChange,
  onSelectStory,
}: Props) {
  const model = buildNodeEvidenceRailModel(node);

  return (
    <aside className="node-evidence-rail" aria-label="路线与证据侧栏">
      <section
        className="rail-section rail-section-route"
        onMouseEnter={() => onEmphasisChange("route")}
        onMouseLeave={() => onEmphasisChange(null)}
        onFocus={() => onEmphasisChange("route")}
        onBlur={(event) => handleEmphasisBlur(event, onEmphasisChange)}
      >
        <div className="rail-heading">
          <h3>路线判定</h3>
        </div>
        <div className="route-segment-list">
          {model.routeSegments.map((segment) => (
            <article className={`route-segment-card cert-${segment.certainty}`} key={segment.id}>
              <span className="route-segment-date mono">{segment.displayDateLabel}</span>
              <div className="route-segment-meta">
                <span className={`cert-chip cert-${segment.certainty}`}>{segment.certaintyLabel}</span>
                <details className="route-segment-sources">
                  <summary className="fine mono">{segment.sourceCount} 条依据</summary>
                  <ul className="route-source-list">
                    {segment.sources.map((source) => (
                      <li key={source.id}>
                        <a href={source.url} target="_blank" rel="noreferrer" title={source.title}>
                          <strong>{source.title}</strong>
                          <small>{source.org}</small>
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
              <p>{segment.reasoning}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="rail-section rail-section-terrain"
        onMouseEnter={() => onEmphasisChange("terrain")}
        onMouseLeave={() => onEmphasisChange(null)}
        onFocus={() => onEmphasisChange("terrain")}
        onBlur={(event) => handleEmphasisBlur(event, onEmphasisChange)}
      >
        <div className="rail-heading">
          <h3>地形读法</h3>
        </div>
        {model.terrainLabel && <p className="terrain-label">{model.terrainLabel}</p>}
        <p className="terrain-cue">{model.sceneCue}</p>
        {model.elevationSummary && (
          <div className="rail-elevation-summary">
            <strong>海拔摘要</strong>
            <span className="mono">
              {model.elevationSummary.minElevMeters}-{model.elevationSummary.maxElevMeters} m
            </span>
            <span className="fine">
              累计爬升约 {model.elevationSummary.ascentMeters} m · 路段约 {model.elevationSummary.totalKm} km
            </span>
          </div>
        )}
      </section>

      {model.relatedStories.length > 0 && (
        <section className="rail-section rail-section-stories">
          <div className="rail-heading">
            <h3>沿途故事</h3>
            <span className="fine mono">{model.relatedStories.length} 条</span>
          </div>
          <div className="node-story-list">
            {model.relatedStories.map((story) => {
              const presentation = getStoryMarkerPresentation(story.shortTitle, story.kind);
              return (
                <button key={story.id} className="node-story-link" onClick={() => onSelectStory(story.id)}>
                  <span className="node-story-glyph" aria-hidden="true">{presentation.glyph}</span>
                  <span className="node-story-body">
                    <strong>{story.title}</strong>
                    <small>{story.dateLabel} · {story.place}</small>
                  </span>
                  <span aria-hidden="true">→</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="rail-section rail-section-sources">
        <div className="rail-heading">
          <h3>史料入口</h3>
          <span className="fine mono">{model.nodeSources.length} 条</span>
        </div>
        <div className="rail-source-list">
          {model.nodeSources.map((source) => (
            <a
              className="rail-source-link"
              key={source.id}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              title={source.title}
            >
              <span className="rail-source-body">
                <strong>{source.title}</strong>
                <small>{source.org}{source.date ? ` · ${source.date}` : ""}</small>
              </span>
              <span aria-hidden="true">↗</span>
            </a>
          ))}
        </div>
      </section>
    </aside>
  );
}
