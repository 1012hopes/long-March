/**
 * 文字冒险的入口
 * ---------------------------------------------------------
 * 约定：play.html 是"在场景里做选择"的那一版，按 #node-xx 定位到某一站。
 * scene.html 保留为"只看画面"的静观版，不再作为主入口。
 * 进入时把"回到哪儿"塞进 ?from=，这样在场景里点离开，
 * 能回到主应用的这一站，而不是甩到一张总览页上。
 */
export function sceneHref(nodeId: string, backHash?: string): string {
  const url = new URL("experience/play.html", document.baseURI);
  url.hash = nodeId;
  const back = new URL("index.html" + (backHash || `#n=${nodeId}`), document.baseURI);
  url.searchParams.set("from", back.href);
  return url.href;
}

export function openScene(nodeId: string) {
  window.location.href = sceneHref(nodeId);
}
