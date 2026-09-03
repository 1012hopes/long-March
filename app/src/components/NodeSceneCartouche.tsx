import type { NodeMapScene } from "../data/nodeScenes.ts";
import type { NodeUnit } from "../data/nodes.ts";
import { scenePrecisionLabel, sceneReadingCue } from "../map/nodeScenePresentation";

type Props = {
  node: NodeUnit;
  scene: NodeMapScene;
};

export default function NodeSceneCartouche({ node, scene }: Props) {
  return (
    <aside className="node-scene-cartouche" role="note" aria-label={`节点 ${node.seq} 地图读图提示`}>
      <div className="node-scene-cartouche-kicker">
        <span className="node-scene-cartouche-index">节点 {String(node.seq).padStart(2, "0")}</span>
        <span className="node-scene-cartouche-precision">{scenePrecisionLabel(node.precision)}</span>
      </div>
      <h2>{node.shortTitle}</h2>
      <p className="node-scene-cartouche-date">{node.displayDateLabel}</p>
      <p className="node-scene-cartouche-cue">{sceneReadingCue(scene)}</p>
    </aside>
  );
}
