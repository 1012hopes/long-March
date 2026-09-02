type Props = { onClose: () => void };

export default function InfoSheet(p: Props) {
  return (
    <div className="info-backdrop" onClick={p.onClose}>
      <div className="info-sheet" role="dialog" aria-modal="true" aria-label="关于本演示" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2>关于本演示</h2>
          <button className="mini-btn" onClick={p.onClose}>
            关闭
          </button>
        </div>
        <div className="info-body">
          <section>
            <h3>这是什么</h3>
            <p>
              《长征·一条路的来处》是一个面向全部群众的非游戏化交互历史地理教育展：跟着真实地理、时间和史料，
              理解中央红军长征为什么这样走。本页面为<strong>视觉与交互原型</strong>，用于确定展陈方向与效果，不是正式版。
            </p>
          </section>
          <section>
            <h3>三种用法</h3>
            <ul>
              <li>跟我走一遍：8 站导览，每站一个核心问题；</li>
              <li>自己查地图：拖动时间、点选节点与路线，看确定 / 约略 / 争议；</li>
              <li>查史料与出处：每个节点 30 秒内找到来源与权利状态。</li>
            </ul>
          </section>
          <section>
            <h3>数据与合规声明（重要）</h3>
            <ul>
              <li>底图为 Natural Earth 物理要素（公有领域），本演示<strong>刻意不绘制国界与省界</strong>；正式版将采用天地图合规底图并履行地图审核程序；</li>
              <li>路线与节点几何为依据史料绘制的<strong>可视化还原示意</strong>，不是逐日精确轨迹；争议段并列候选线，不预设正确答案；</li>
              <li>地形晕渲与海拔剖面依据开放 DEM（AWS Terrain Tiles，源自 SRTM / NASADEM 等开放数据）派生，不用于证明历史路线；</li>
              <li>史料条目来自项目组台账（含权威机构链接与权利状态），演示中不复制受版权保护的原文与影像；</li>
              <li>九个单元的文字为演示稿，正式版须经历史专业人员审核签字后采用。</li>
            </ul>
          </section>
          <section>
            <h3>操作</h3>
            <ul>
              <li>拖动底部时间尺或点击 ▶ 播放，路线沿时间顺序显影；</li>
              <li>点击节点标记或左侧列表打开节点学习面板；Esc 逐层关闭面板；</li>
              <li>「专注地图」一次收起全部面板；「3D 地形」切换三维视角。</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
