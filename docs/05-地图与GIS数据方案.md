# 地图与 GIS 数据方案

## 1. 合规优先级

中国境内公开展示不得使用来源不明或边界表达不符合规范的底图。优先级：

1. 自然资源部标准地图服务系统用于封面、PPT、展板和静态总览；
2. 天地图国家或省级官方节点用于在线底图服务；
3. 自制历史专题数据叠加在合规底图之上；
4. NASA / Copernicus 开放 DEM 只用于地形派生，不用于证明历史路线；
5. 未确认授权前，不把天地图瓦片打成离线包再分发。

## 2. 路线精度模型

| 等级 | 含义 | 几何 | 视觉 |
| --- | --- | --- | --- |
| 确定 `confirmed` | 史料可确认点位或区段 | Point / LineString | 实线 + “史料明确记载” |
| 约略 `approximate` | 只确认 A-B 或某走廊 | Polygon 走廊 + 示意中心线 | 半透明走廊 + “约略范围” |
| 争议 `disputed` | 来源给出不同路线或时间 | 同 dispute group 多条候选 | 多候选线 + 来源并列 |

规则：

- 时间字段使用 `not_before`、`not_after` 和 `display_date_label`；
- 不使用伪逐日 GPS；
- 山地段宁用走廊，不硬画单线；
- 现代公路、水系和行政区只作背景解释；
- 每段路线必须挂来源 ID 和推理说明；
- 地图图例必须解释精度，不只靠颜色区分。

## 3. 推荐数据源

### 合规地图

- [自然资源部标准地图服务系统](http://bzdt.ch.mnr.gov.cn/)
- [国家地理信息公共服务平台 天地图](https://www.tianditu.gov.cn/)
- [国家基础地理信息中心：天地图建设](https://ngcc.cn/zdchgc/tdtjs/)
- [自然资源部地图审核办事指南](https://gjzwfw.www.gov.cn/fwmh/item/v3/item_11100000MB032716991000115035000.do)

正式公开前必须咨询：

- 在线叠加历史路线是否需要送审；
- 标准地图裁切、缩放、标注和导出截图的边界；
- 比赛视频、展板和离线课堂包分别如何处理审图号；
- 是否需标注天地图来源和服务条款。

### 地形

- [NASA SRTMGL1 V003](https://www.earthdata.nasa.gov/data/catalog/lpcloud-srtmgl1-003)
- [NASADEM HGT V001](https://www.earthdata.nasa.gov/data/catalog/lpcloud-nasadem-hgt-001)
- [NASA Earthdata 数据政策](https://www.earthdata.nasa.gov/engage/open-data-services-software/data-use-policy)
- [Copernicus DEM](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM)

DEM 派生产品需记录：源产品、版本、水平/垂直基准、分辨率、采样步长、处理工具、生成日期和署名。

## 4. 坐标系与偏移

- 天地图核心使用 CGCS2000，具体服务可能是经纬度或墨卡托瓦片；
- SRTM / NASADEM 多按 WGS84 水平基准和 EGM 高程模型；
- Copernicus DEM 使用 WGS84-G1150 / EGM2008 等产品定义；
- 项目必须在预处理阶段统一声明 CRS 和高程基准；
- 任何坐标转换都要自动化测试已知控制点；
- 不通过“手动拖一下”修正路线偏移。

## 5. 核心数据结构

```ts
type RouteSegment = {
  id: string
  seq: number
  unit: 'central-red-army'
  fromPlaceId?: string
  toPlaceId?: string
  notBefore?: string
  notAfter?: string
  displayDateLabel: string
  certainty: 'confirmed' | 'approximate' | 'disputed'
  geometryRole: 'centerline' | 'corridor' | 'candidate'
  disputeGroupId?: string
  geometry: GeoJSON.Geometry
  sourceIds: string[]
  reasoning: string
}

type Place = {
  id: string
  modernName: string
  historicalNames: string[]
  centroid: [number, number]
  precision: 'exact' | 'approximate'
  sourceIds: string[]
}

type ElevationProfile = {
  segmentId: string
  demSource: 'SRTM' | 'NASADEM' | 'COPDEM30'
  sampleStepMeters: number
  minElevMeters: number
  maxElevMeters: number
  ascentMeters: number
  descentMeters: number
  profile: Array<{ distanceMeters: number; elevationMeters: number }>
}
```

内容、来源、媒体和图层结构见 `07-技术可行性与Spike清单.md`。

路线段研究状态逐条记录在 `research/route-segment-register.csv`。该台账保存起止节点、时间范围、精度、几何角色、争议组、来源与推理；`geometry_status=not-digitized` 表示尚未绘制，不能被产品或材料引用。

## 6. 在线与离线两档

### 当前原型实现（2026-09-04）

- MapLibre GL 承载当前可演示原型；正式技术选型仍需天地图与坐标系 Spike 后确认；
- 首屏加载本地全局高程设色与 hillshade，不等待在线 DEM；
- 九个节点各有一组本地高分辨率 tint/hillshade 裁切，进入节点学习时按 manifest 加载，缺失时保留全局离线地形；
- 200 米等高线在地图空闲后加载，100/50 米等高线只在相应缩放阈值后加载；节点学习模式隐藏细等高线，避免纹理压过路线与山河；
- 在线 Terrarium DEM 仅在后台预取或用户开启 3D 时加载，具有 `local / loading / ready / offline` 状态和取消后重试能力；
- 节点地图场景记录取景范围、重点/上下文路线、地形类型与带 `sourceIds` 的标注；约略标注只使用现有节点、故事或路线折点；
- 于都河、湘江、乌江、赤水河、金沙江、大渡河及相关山地表达使用现有水系数据或来源可追溯点位，不以 DEM 证明历史路线。

### 在线合规模式

- 天地图在线底图；
- 本地历史路线、节点、史料元数据；
- 地形按需加载；
- 标注底图来源和服务条款；
- 不开放用户上传坐标和地图编辑。

### 离线课堂模式

- 自制历史专题矢量；
- 开放 DEM 派生 hillshade 和海拔剖面；
- 经过合规确认的静态总览图；
- 本地史料卡和文字路线；
- 不默认缓存或再分发天地图瓦片。

当前原型已验证“页面完成加载后断网，节点地图与阅读继续可用”；尚未实现 Service Worker 意义上的断网刷新，因此 S4 离线课堂门禁仍未通过。

## 7. 地图审核风险

依据《地图管理条例》，公开地图、国界和行政区界线表达、互联网地图服务均有合规要求。项目必须把以下内容当作外部法律门禁，而不是开发后补文案：

- 审图号；
- 国界与行政区界线；
- 地图裁切、缩放、标注与导出；
- 数据服务器与互联网地图服务边界；
- 底图来源署名；
- 离线包分发授权。

未经主管部门或专业指导确认，不对外发布地图成品。
