/** 古今对照的导读卡：交代怎么看、能判断什么、前因后果，并用名句点题。
 *  内容为固定教学文案；地名与史实均可在节点史料中溯源。 */
export default function CompareGuide() {
  return (
    <aside className="compare-guide" aria-label="古今对照导读">
      <h3>古今对照 · 同一条山河</h3>
      <figure className="compare-guide-quote">
        <blockquote>
          五岭逶迤腾细浪，乌蒙磅礴走泥丸。
          <br />
          金沙水拍云崖暖，大渡桥横铁索寒。
        </blockquote>
        <figcaption>—— 毛泽东《七律·长征》（1935年10月）</figcaption>
      </figure>
      <dl>
        <dt>怎么看</dt>
        <dd>拖动分割线，对准同一座山、同一条河：左侧是当年的档案记录与手绘标注，右侧是今天的卫星高程测绘。</dd>
        <dt>能判断什么</dt>
        <dd>山河是常量，选择是变量。峡谷、雪山、大河是当年真实的行军约束——今天仍可在地形上验证，这正是理解“为什么非这样走不可”的证据。</dd>
        <dt>前因后果</dt>
        <dd>第五次反“围剿”失利 → 被迫战略转移 → 沿途被围追堵截 → 只能沿山河缝隙机动（四渡赤水、巧渡金沙、飞夺泸定）→ 翻雪山过草地 → 落脚陕北。</dd>
      </dl>
      <p className="compare-guide-fine">地形不证明历史路线；对比用于理解决策所处的地理条件。</p>
    </aside>
  );
}
