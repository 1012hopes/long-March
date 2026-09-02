# 技术可行性与 Spike 清单

本文件只用于开工前验证，不代表已确定实现。

## 1. 候选技术路线

- React + TypeScript + Vite；
- OpenLayers 作为 2D 地图引擎；
- ECharts 或轻量 SVG 组件处理时间轴和海拔剖面；
- GeoJSON / TopoJSON 保存路线、走廊和节点；
- PWA + Service Worker 处理应用壳与离线课堂包；
- 数据预处理使用 GDAL / ogr2ogr；
- IndexedDB 只在确有大数据缓存需求时使用；
- 不在第一版引入 Cesium、实时 3D、后端数据库或大模型。

选择 OpenLayers 的原因：CGCS2000、WMTS、天地图和自定义投影支持比炫 3D 更重要。

## 2. 核心 Schema 草案

```ts
type Source = {
  id: string
  title: string
  sourceType: 'archive' | 'book' | 'paper' | 'memoir' | 'official-map' | 'web'
  citation: string
  url?: string
  reliability: 'high' | 'medium' | 'low'
  rightsStatus: 'cleared' | 'permission-needed' | 'citation-only' | 'blocked'
}

type EventUnit = {
  id: string
  title: string
  conciseText: string
  deepText: string
  coreQuestion: string
  notBefore?: string
  notAfter?: string
  displayDateLabel: string
  placeIds: string[]
  routeSegmentIds: string[]
  sourceIds: string[]
  labels: Array<'fact' | 'interpretation' | 'reconstruction' | 'disputed'>
  reviewStatus: 'research' | 'review' | 'approved'
}

type Media = {
  id: string
  type: 'image' | 'document' | 'audio' | 'video'
  sourceId: string
  rightsRecordId: string
  altText: string
  localAsset?: string
}
```

## 3. 必做 Spike

### S1. 天地图接入

验证：

- `tk`、域名白名单和官方服务稳定性；
- OpenLayers 接入经纬度和墨卡托服务；
- CGCS2000 图层与本地历史路线对齐；
- 来源署名；
- 断网和限流表现。

通过条件：桌面、手机和投影加载稳定；控制点无肉眼可见偏移；合规说明有书面依据。

### S2. 路线不确定性

选择一个路段制作确定线、约略走廊和争议候选线。

通过条件：5 名用户中至少 4 名能解释三种精度，不把走廊当实际行军宽度。

### S3. DEM 对比

在夹金山段比较 SRTM、NASADEM、Copernicus DEM 的剖面、总爬升和处理成本。

通过条件：确定一种来源；记录版本、基准和差异；不宣称 DEM 证明历史路线。

### S4. 离线课堂

打包一个节点的路线、文字、史料元数据、地形图和剖面。

通过条件：断网刷新后完整使用；不包含未经许可的天地图瓦片和媒体。

### S5. 投影与触摸

在 1280×720 / 1920×1080 投影和 390×844 手机测试。

通过条件：无 hover 依赖；主要字号可读；键盘与触摸完成主导览；地图不卡顿。

### S6. 地图审核咨询

拿标准地图、历史路线叠加、导出截图、PPT、视频和离线包示意咨询主管部门或专业单位。

通过条件：形成书面问题清单、答复记录和后续送审决定。

## 4. 性能预算

- 首屏 JS + CSS ≤300KB gzip；
- 中端安卓首次可交互 <4s；
- 教室笔记本首次可交互 <2.5s；
- 初始路线数据 ≤2MB 未压缩 GeoJSON；
- 单段海拔剖面 256-1024 点；
- 移动端同屏史料卡 ≤30；
- 移动端内存目标 ≤250MB；
- 地图平移缩放 ≥30fps；
- 所有主内容可离线；在线底图失败时有明确降级。

## 5. Spike 输出物

每个 Spike 必须交付：

- 问题；
- 输入数据和许可；
- 最小代码或原型；
- 截图 / 性能数据；
- 结论；
- 失败原因；
- 是否进入正式方案；
- 待确认的法律、史实或技术问题。

没有通过 Spike 的技术不得写进正式答辩承诺。

