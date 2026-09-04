# Task 7 Report

完成。

新增水系/山地表达与学习态水系层，六条关键水系已在对应节点可读，`node-08` 也补上夹金山/雪山山地语义；近似渡口现在使用“约略渡口”文案与 `渡` glyph。

复审修正：point/mountain-backed 标签与 provenance 现统一保留 authored/source-backed `clipBounds`，与 feature property 完全一致；若需要更小的视觉命中框，则单独记录为 `labelHitBounds`。

验证：

- `npm run test:scenes` PASS
- `npm run test:loading` PASS
- `npm run test:learning` PASS
- `npm run test:map` PASS
- `npm run build` PASS
- `git diff --check` PASS

视觉评分：94/100

主要保留项：390px 的 `node-08` 学习态仍略紧，但未破坏层级或可读性。
