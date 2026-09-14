import { useEffect, useMemo, useState } from "react";
import type { NodeUnit } from "../data/nodes";
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
};

export default function ScenePhotoModal({ node, compareOn, onClose, onOpenFullNode }: Props) {
  const photo = useMemo(() => scenePhotoForNode(node.id), [node.id]);
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
          {onOpenFullNode && (
            <button type="button" className="primary-btn" onClick={onOpenFullNode}>
              进入学习卷宗
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
