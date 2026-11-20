import { useEffect, useMemo, useState } from "react";
import type { NodeUnit } from "../data/nodes";
import { sideTripsFor } from "../data/sideTrips";
import {
  defaultSceneEra,
  sceneEraLabel,
  sceneImageAlt,
  sceneImageSrc,
  scenePhotoForNode,
  type SceneEra,
} from "../data/scenePhotos";

type Props = {
  node: NodeUnit;
  compareOn: boolean;
  onClose: () => void;
  onOpenFullNode?: () => void;
  onEnterScene?: () => void;
};

export default function ScenePhotoModal({ node, compareOn, onClose, onOpenFullNode, onEnterScene }: Props) {
  const photo = useMemo(() => scenePhotoForNode(node.id), [node.id]);
  const sides = useMemo(() => sideTripsFor(node.id), [node.id]);
  const [era, setEra] = useState<SceneEra>(() => defaultSceneEra(compareOn));
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setEra(defaultSceneEra(compareOn));
    setImgFailed(false);
  }, [node.id, compareOn]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  if (!photo) return null;

  const src = sceneImageSrc(photo, era);
  const alt = sceneImageAlt(photo, era);

  return (
    <div className="scene-photo-backdrop" role="presentation" onClick={onClose}>
      <aside
        className={`scene-photo-modal era-${era}`}
        role="dialog"
        aria-modal="true"
        aria-label={`${node.title} · ${sceneEraLabel(era)}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="scene-photo-head">
          <div>
            <span className="scene-photo-kicker mono">
              SCENE · {String(node.seq).padStart(2, "0")} · {sceneEraLabel(era)}
            </span>
            <h2>{node.shortTitle}</h2>
            <p className="scene-photo-meta">{node.displayDateLabel}</p>
          </div>
          <button type="button" className="mini-btn" onClick={onClose} aria-label="关闭场景照片">
            关闭
          </button>
        </header>

        <div className="scene-photo-frame">
          {imgFailed ? (
            <div className="scene-photo-fallback">
              <p>场景图暂不可用</p>
              <p className="fine">{node.shortTitle}</p>
            </div>
          ) : (
            <img src={src} alt={alt} onError={() => setImgFailed(true)} />
          )}
          <div className="scene-photo-caption">
            <span>{alt}</span>
            <span className="fine">{photo.credit}</span>
          </div>
        </div>

        {onEnterScene && (
          <p className="scene-photo-hint">
            <b>走进去</b>是一次文字冒险：你在一处停下来，面前有几条路——先问、先看、先动手，还是先往前挪，
            由你选。不同的选法会撞见不同的史料，也会走到不同的结局。
          </p>
        )}

        {sides.length > 0 && (
          <div className="scene-photo-sides">
            <div className="sides-k">这一站旁边的岔路 · 支线</div>
            <div className="sides-list">
              {sides.map((s) => (
                <a key={s.id} className="side-link" href={`experience/play.html#${s.id}`}>
                  <span className="side-t">{s.title}</span>
                  <span className="side-w">{s.who}</span>
                  <span className="side-n">{s.note}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="scene-photo-actions">
          <div className="era-switch" role="tablist" aria-label="古今场景">
            <button
              type="button"
              className={era === "then" ? "active" : ""}
              aria-pressed={era === "then"}
              onClick={() => setEra("then")}
            >
              当时
            </button>
            <button
              type="button"
              className={era === "now" ? "active" : ""}
              aria-pressed={era === "now"}
              onClick={() => setEra("now")}
            >
              当今
            </button>
          </div>
          <div className="scene-photo-cta">
            {onEnterScene && (
              <button type="button" className="primary-btn scene-enter-btn" onClick={onEnterScene}>
                走进去 · 文字冒险
              </button>
            )}
            {onOpenFullNode && (
              <button type="button" className="ghost-btn" onClick={onOpenFullNode}>
                读卷宗
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
