# data.json 配置说明书

> 本文档详细说明 `data.json` 中所有可用的配置项。修改后刷新 HTML 页面即可生效。

---

## 目录

1. [顶层结构](#顶层结构)
2. [cover — 封面页](#cover--封面页)
3. [features — 特点页](#features--特点页)
4. [practices — 测试实践页](#practices--测试实践页)
5. [impressions — 使用感想页](#impressions--使用感想页)
6. [scores — 综合评分页](#scores--综合评分页)
7. [usecases — 应用场景页](#usecases--应用场景页)
8. [cta — 结尾页](#cta--结尾页)
9. [customPages — 自定义页面](#custompages--自定义页面)
   - [页面级字段](#页面级字段)
   - [内容块模板一览](#内容块模板一览)
   - [边框样式 (style)](#边框样式-style)
   - [模板: hero-text](#模板-hero-text)
   - [模板: two-col](#模板-two-col)
   - [模板: gallery](#模板-gallery)
   - [模板: quote](#模板-quote)
   - [模板: feature-list](#模板-feature-list)
   - [模板: video](#模板-video)
   - [模板: stats](#模板-stats)
10. [extraSlides — 额外页面（iframe）](#extraslides--额外页面iframe)
11. [slideOrder — 页面排序](#slideorder--页面排序)
12. [animations — 背景粒子动画](#animations--背景粒子动画)
13. [cartoonText — 卡通文字](#cartoontext--卡通文字)
14. [通用规则](#通用规则)

---

## 顶层结构

```jsonc
{
  "cover": { ... },           // 封面页
  "features": { ... },        // 特点页
  "practices": { ... },       // 测试实践页
  "impressions": { ... },     // 使用感想页
  "scores": { ... },          // 综合评分页
  "usecases": { ... },        // 应用场景页
  "cta": { ... },             // 结尾页
  "customPages": [ ... ],     // 自定义页面（可多个）
  "extraSlides": [ ... ],     // 额外 iframe 页面
  "slideOrder": [ ... ],      // 页面排序
  "animations": [ ... ],      // 背景粒子动画
  "cartoonText": { ... }      // 卡通文字
}
```

---

## 通用规则

| 规则 | 说明 |
|------|------|
| **颜色字段** | `bg`、`fg` 等颜色字段留空 `""` 则使用默认颜色 |
| **附件字段 `code` / `media`** | 根据文件后缀自动判断渲染方式：`.png/.jpg/.gif/.webp` → 图片，`.mp4/.webm/.mov` → 视频，其他 → 代码块 |
| **图片/视频路径** | 支持相对路径（如 `./static/img.png`）、绝对路径（如 `/gpt5.6sol/static/img.png`）和完整 URL |
| **items 数组** | 各页面的 `items` 数组可自由增删条目，数量不限 |

---

## cover — 封面页

```jsonc
{
  "cover": {
    "bg": "",                    // 背景色，留空使用默认白色
    "fg": "",                    // 文字色，留空使用默认深色
    "product": "GPT5.6-sol",     // 产品名称（红色高亮显示）
    "questionSuffix": "为什么强",  // 标题后缀，完整标题 = product + questionSuffix
    "subtitle": "...",           // 副标题
    "tagline": "...",            // 标语（标题与副标题之间的装饰文字）
    "badges": ["标签1", "标签2"]  // 标签数组，显示为圆角徽章
  }
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `bg` | string | 否 | 背景色，如 `"#fdf2f4"` |
| `fg` | string | 否 | 文字颜色 |
| `product` | string | 是 | 产品/项目名称 |
| `questionSuffix` | string | 否 | 标题后缀，默认 `"可以做什么？"` |
| `subtitle` | string | 否 | 副标题描述 |
| `tagline` | string | 否 | 装饰性标语 |
| `badges` | string[] | 否 | 标签列表 |

---

## features — 特点页

```jsonc
{
  "features": {
    "bg": "",
    "fg": "",
    "tag": "流程",              // 页面左上角标签
    "title": "...",             // 区域标题
    "desc": "...",              // 区域描述
    "items": [                  // 特点列表
      {
        "title": "特点标题",
        "desc": "特点描述文本",
        "code": "图片路径或视频路径"  // 可选附件
      }
    ]
  }
}
```

**items 子项字段：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | 是 | 特点标题 |
| `desc` | string | 是 | 特点描述 |
| `code` | string | 否 | 附件：图片URL / 视频URL / 代码文本 |

---

## practices — 测试实践页

```jsonc
{
  "practices": {
    "bg": "",
    "fg": "",
    "tag": "测试实践",
    "title": "审计结果对比",
    "desc": "...",
    "items": [
      {
        "label": "分类标签",       // 卡片左上角小标签
        "title": "实践标题",
        "desc": "实践描述",
        "code": ""                // 可选附件
      }
    ]
  }
}
```

**items 子项字段：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `label` | string | 是 | 小标签文字 |
| `title` | string | 是 | 标题 |
| `desc` | string | 是 | 描述 |
| `code` | string | 否 | 附件 |

---

## impressions — 使用感想页

```jsonc
{
  "impressions": {
    "bg": "",
    "fg": "",
    "tag": "使用感想",
    "title": "核心结论",
    "desc": "...",
    "items": [
      {
        "quote": "引用语内容",
        "author": "作者署名",
        "code": ""               // 可选附件
      }
    ]
  }
}
```

**items 子项字段：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `quote` | string | 是 | 引用语内容，斜体大字显示 |
| `author` | string | 是 | 署名 |
| `code` | string | 否 | 附件 |

---

## scores — 综合评分页

```jsonc
{
  "scores": {
    "bg": "",
    "fg": "",
    "tag": "综合评分",
    "title": "综合评分",
    "desc": "...",
    "items": [
      { "label": "网页生成", "value": 80 },
      { "label": "PPT 生成", "value": 75 }
    ]
  }
}
```

**items 子项字段：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `label` | string | 是 | 评分维度名称 |
| `value` | number | 是 | 分数，范围 0–100 |

页面底部会自动计算并显示所有维度的平均分。

---

## usecases — 应用场景页

```jsonc
{
  "usecases": {
    "bg": "",
    "fg": "",
    "tag": "场景",
    "title": "应用场景",
    "desc": "...",
    "items": [
      {
        "icon": "🌐",            // Emoji 图标
        "title": "营销落地页",
        "desc": "快速生成品牌宣传...",
        "tag": "网页",            // 分类标签
        "code": ""               // 可选附件
      }
    ]
  }
}
```

**items 子项字段：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `icon` | string | 是 | Emoji 或文字符号 |
| `title` | string | 是 | 场景标题 |
| `desc` | string | 是 | 场景描述 |
| `tag` | string | 是 | 分类标签 |
| `code` | string | 否 | 附件 |

---

## cta — 结尾页

```jsonc
{
  "cta": {
    "bg": "",
    "fg": "",
    "title": "GPT5.6-sol 为什么更强？",
    "subtitle": "更多 BUG 发现 · 更深入的跨文件分析...",
    "btnText": "感谢观看",       // 按钮文字
    "features": [               // 顶部统计数字
      { "num": "64", "lbl": "总 BUG 发现" },
      { "num": "26", "lbl": "高风险发现" },
      { "num": "+18.5%", "lbl": "检出率提升" }
    ]
  }
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | 是 | 结尾大标题 |
| `subtitle` | string | 否 | 副标题 |
| `btnText` | string | 是 | 按钮文字 |
| `features` | array | 否 | 顶部数字指标列表 |

**features 子项字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `num` | string | 数字值（支持文字如 `"+18.5%"`） |
| `lbl` | string | 标签说明 |

---

## customPages — 自定义页面

自定义页面是通过 **内容块模板** 拼装而成的页面。每个页面可包含多个内容块，每个内容块从 7 种预设模板中选择，并可指定不同的边框样式。

### 页面级字段

```jsonc
{
  "customPages": [
    {
      "id": "my-page",          // 唯一标识符，用于 slideOrder 引用
      "title": "页面标题",
      "tag": "页面标签",         // 左上角红色标签
      "desc": "页面描述",        // 标题下方灰色描述
      "bg": "",                 // 页面背景色
      "fg": "",                 // 页面文字色
      "blocks": [               // 内容块数组，按顺序从上到下排列
        { "template": "hero-text", "style": "solid", ... },
        { "template": "two-col", "style": "dashed", ... }
      ]
    }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | **是** | 唯一标识符，纯英文+连字符，如 `"demo"`、 `"my-custom-page"` |
| `title` | string | 否 | 页面标题 |
| `tag` | string | 否 | 页面左上角标签 |
| `desc` | string | 否 | 页面描述 |
| `bg` | string | 否 | 背景色 |
| `fg` | string | 否 | 文字色 |
| `blocks` | array | **是** | 内容块列表 |

> **重要：** `id` 必须唯一，且在 `slideOrder` 中通过 `"custom:你的id"` 引用。例如 `id` 为 `"demo"` 时，`slideOrder` 中写 `"custom:demo"`。

---

### 内容块模板一览

| 模板值 | 名称 | 说明 | 支持媒体 |
|--------|------|------|----------|
| `hero-text` | 大标题文本 | 居中大标题 + 副标题 + 可选媒体 | `media` |
| `two-col` | 左右分栏 | 文字区 + 媒体区左右排列 | `media` |
| `gallery` | 图片画廊 | 网格展示多张图片/视频 | `items[].media` |
| `quote` | 引用块 | 大字引用 + 署名 | 无 |
| `feature-list` | 功能列表 | 图标 + 标题 + 描述网格 | 无 |
| `video` | 视频展示 | 视频播放器 + 标题描述 | `media` |
| `stats` | 数据统计 | 大数字统计行 | 无 |

---

### 边框样式 (style)

每个内容块可通过 `style` 字段选择不同的边框样式，影响整个块的外框外观。

```jsonc
{
  "template": "two-col",
  "style": "solid",     // ← 边框样式
  "title": "...",
  "text": "..."
}
```

| 值 | 名称 | 效果 |
|----|------|------|
| `solid` | 实线边框 | 2px 实线边框 + 6px 阴影，hover 时变红色（**默认**） |
| `dashed` | 虚线边框 | 2px 虚线边框，无阴影，轻量简洁感 |
| `double` | 双线边框 | 4px 双线边框 + 4px 阴影，典雅正式感 |
| `rounded` | 圆角边框 | 2px 实线 + 16px 圆角 + 6px 阴影，现代柔和感 |
| `accent` | 强调色边框 | 2px 红色边框 + 顶部 4px 红色装饰条，醒目突出 |

> 不写 `style` 字段时默认为 `"solid"`。不同块可使用不同样式，同一页内可混搭。

---

### 模板: hero-text

居中大标题，适用于页面开头或强调性内容。

```jsonc
{
  "template": "hero-text",
  "style": "solid",
  "title": "大标题文字",
  "subtitle": "副标题描述文字",
  "media": ""    // 可选：图片URL 或 视频URL，留空则不显示
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `template` | string | **是** | 固定值 `"hero-text"` |
| `style` | string | 否 | 边框样式，默认 `"solid"`，可选 `solid` / `dashed` / `double` / `rounded` / `accent` |
| `title` | string | 否 | 大标题 |
| `subtitle` | string | 否 | 副标题 |
| `media` | string | 否 | 媒体资源路径 |

**示例：**
```json
{
  "template": "hero-text",
  "style": "rounded",
  "title": "欢迎来到产品展示",
  "subtitle": "一站式智能办公解决方案",
  "media": "./static/hero-banner.png"
}
```

---

### 模板: two-col

左右分栏布局，左侧文字 + 右侧媒体（或反转）。

```jsonc
{
  "template": "two-col",
  "style": "solid",
  "title": "分栏标题",
  "text": "左侧的文本内容...",
  "media": "",        // 可选：图片或视频
  "reverse": false    // true = 媒体在左，文字在右
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `template` | string | **是** | 固定值 `"two-col"` |
| `style` | string | 否 | 边框样式，默认 `"solid"` |
| `title` | string | 否 | 分栏标题 |
| `text` | string | 否 | 文本内容 |
| `media` | string | 否 | 媒体资源路径 |
| `reverse` | boolean | 否 | 是否反转布局，默认 `false` |

**示例：**
```json
{
  "template": "two-col",
  "style": "dashed",
  "title": "核心架构",
  "text": "采用微服务架构设计，支持水平扩展和高可用部署...",
  "media": "./static/architecture.png",
  "reverse": false
}
```

---

### 模板: gallery

网格图片/视频画廊，适合展示多张截图或产品图。

```jsonc
{
  "template": "gallery",
  "style": "solid",
  "title": "画廊标题",
  "items": [
    { "media": "./static/img1.png", "caption": "图片说明1" },
    { "media": "./static/img2.png", "caption": "图片说明2" },
    { "media": "./static/demo.mp4", "caption": "演示视频" }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `template` | string | **是** | 固定值 `"gallery"` |
| `style` | string | 否 | 边框样式，默认 `"solid"` |
| `title` | string | 否 | 画廊标题 |
| `items` | array | **是** | 图片/视频列表 |

**items 子项字段：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `media` | string | **是** | 图片或视频路径 |
| `caption` | string | 否 | 图片下方说明文字 |

> 画廊默认 3 列网格布局，自动适配内容。

---

### 模板: quote

大字引用块，适合展示名言、结论或用户评价。

```jsonc
{
  "template": "quote",
  "style": "solid",
  "text": "引用的语句内容...",
  "author": "作者署名"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `template` | string | **是** | 固定值 `"quote"` |
| `style` | string | 否 | 边框样式，默认 `"solid"` |
| `text` | string | 是 | 引用语内容 |
| `author` | string | 否 | 署名 |

**示例：**
```json
{
  "template": "quote",
  "style": "accent",
  "text": "该产品将开发效率提升了 3 倍以上。",
  "author": "技术评审报告"
}
```

---

### 模板: feature-list

图标 + 标题 + 描述的功能列表网格，2 列布局。

```jsonc
{
  "template": "feature-list",
  "style": "solid",
  "title": "功能列表标题",
  "items": [
    { "icon": "🚀", "title": "高速处理", "desc": "毫秒级响应，支持大规模并发" },
    { "icon": "🔒", "title": "安全可靠", "desc": "端到端加密，数据不落地" }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `template` | string | **是** | 固定值 `"feature-list"` |
| `style` | string | 否 | 边框样式，默认 `"solid"` |
| `title` | string | 否 | 列表标题 |
| `items` | array | **是** | 功能项列表 |

**items 子项字段：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `icon` | string | 否 | Emoji 或符号，默认 `"✦"` |
| `title` | string | 否 | 功能名称 |
| `desc` | string | 否 | 功能描述 |

---

### 模板: video

全宽视频播放器，适合嵌入演示视频或教程。

```jsonc
{
  "template": "video",
  "style": "solid",
  "title": "视频标题",
  "text": "视频下方的描述文字",
  "media": "./static/demo.mp4"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `template` | string | **是** | 固定值 `"video"` |
| `style` | string | 否 | 边框样式，默认 `"solid"` |
| `title` | string | 否 | 视频标题 |
| `text` | string | 否 | 视频描述 |
| `media` | string | **是** | 视频文件路径 |

---

### 模板: stats

大数字统计行，适合展示关键指标。

```jsonc
{
  "template": "stats",
  "style": "solid",
  "title": "数据概览",
  "items": [
    { "value": "1000+", "label": "活跃用户" },
    { "value": "99.9%", "label": "可用性" },
    { "value": "50ms", "label": "平均延迟" }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `template` | string | **是** | 固定值 `"stats"` |
| `style` | string | 否 | 边框样式，默认 `"solid"` |
| `title` | string | 否 | 统计标题 |
| `items` | array | **是** | 统计项列表 |

**items 子项字段：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `value` | string | **是** | 数值（支持 `"+"` `"%"` 等符号） |
| `label` | string | **是** | 指标说明 |

---

## extraSlides — 额外页面（iframe）

嵌入外部 HTML 文件或网页 URL 作为独立幻灯片。

```jsonc
{
  "extraSlides": [
    {
      "title": "网页生成",
      "src": "http://127.0.0.1:3000/components/md-viewer.html"
    }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | 否 | 页面标题（在排序中显示用） |
| `src` | string | **是** | HTML 文件路径或完整 URL |

> 额外页面通过 iframe 全屏嵌入，占满整个幻灯片区域。

---

## slideOrder — 页面排序

控制所有页面的显示顺序。

```jsonc
{
  "slideOrder": [
    "cover",           // 封面
    "features",        // 特点
    "custom:demo",     // 自定义页面（id=demo）
    "practices",       // 测试实践
    "impressions",     // 使用感想
    "scores",          // 综合评分
    "usecases",        // 应用场景（可选，不写则自动追加到末尾）
    "cta"              // 结尾
  ]
}
```

**可用的页面 ID：**

| ID | 说明 |
|----|------|
| `cover` | 封面页 |
| `features` | 特点页 |
| `practices` | 测试实践页 |
| `impressions` | 使用感想页 |
| `scores` | 综合评分页 |
| `usecases` | 应用场景页 |
| `cta` | 结尾页 |
| `custom:你的id` | 自定义页面（如 `custom:demo`） |
| `额外页面的title` | 额外 iframe 页面（与 `extraSlides[].title` 一致） |

**规则：**
- 内置页面可任意排序或省略（省略的内置页面不会显示）
- 未出现在 `slideOrder` 中的自定义页面和额外页面会自动追加到末尾
- 留空 `[]` 或不写此字段则使用默认顺序

---

## animations — 背景粒子动画

```jsonc
{
  "animations": [
    {
      "name": "particles",
      "enabled": true,
      "css": "",
      "js": "plugins/particles.js",
      "config": {
        "style": "nodes",
        "count": 60,
        "color": "#e11d48",
        "opacity": 0.15,
        "speed": 0.3
      }
    }
  ]
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 插件名称 |
| `enabled` | boolean | 是否启用 |
| `css` | string | 自定义 CSS 文件路径（可选） |
| `js` | string | 插件 JS 文件路径 |
| `config.style` | string | 粒子风格：`nodes` / `stars` / `bubbles` / `fireflies` / `snow` / `aurora` |
| `config.count` | number | 粒子数量（5–200） |
| `config.color` | string | 粒子颜色 |
| `config.opacity` | number | 透明度（0.02–1） |
| `config.speed` | number | 移动速度（0.02–1） |

---

## cartoonText — 卡通文字

屏幕角落的卡通风格动画文字。

```jsonc
{
  "cartoonText": {
    "text": "三极客智嵌社",
    "color": "#e11d48",
    "position": "bottom-left",
    "anims": ["bounce", "wiggle", "pulse", "spin", "shake", "float"]
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `text` | string | 显示的文字 |
| `color` | string | 文字颜色 |
| `position` | string | 位置：`bottom-left` / `bottom-right` / `top-left` / `top-right` |
| `anims` | string[] | 每个字的动画，与 `text` 字符一一对应 |

**可用动画：**

| 值 | 说明 |
|----|------|
| `bounce` | 弹跳 |
| `wiggle` | 摆动 |
| `spin` | 旋转 |
| `pulse` | 脉动 |
| `shake` | 抖动 |
| `float` | 漂浮 |

> `anims` 数组长度需与 `text` 字符数一致，不足自动补 `bounce`，多余自动截断。

---

## 完整示例

以下是一个包含自定义页面的完整 data.json 示例：

```jsonc
{
  "cover": {
    "bg": "",
    "fg": "",
    "product": "MyApp",
    "questionSuffix": "能做什么",
    "subtitle": "新一代智能开发工具",
    "badges": ["AI 驱动", "开源", "跨平台"]
  },
  "features": {
    "bg": "",
    "fg": "",
    "tag": "核心功能",
    "title": "为什么选择 MyApp",
    "desc": "三大核心能力，覆盖开发全流程",
    "items": [
      { "title": "智能补全", "desc": "基于大模型的代码智能补全", "code": "" },
      { "title": "自动测试", "desc": "AI 自动生成单元测试", "code": "" },
      { "title": "代码审查", "desc": "实时检测潜在问题和安全漏洞", "code": "" }
    ]
  },
  "customPages": [
    {
      "id": "showcase",
      "title": "产品展示",
      "tag": "产品",
      "desc": "通过多种内容块模板展示产品细节",
      "bg": "",
      "fg": "",
      "blocks": [
        {
          "template": "hero-text",
          "style": "rounded",
          "title": "MyApp 产品展示",
          "subtitle": "用内容块模板构建的自定义页面",
          "media": "./static/screenshot.png"
        },
        {
          "template": "two-col",
          "style": "solid",
          "title": "核心架构",
          "text": "采用微服务架构，支持弹性伸缩...",
          "media": "./static/arch.png",
          "reverse": false
        },
        {
          "template": "gallery",
          "style": "dashed",
          "title": "界面截图",
          "items": [
            { "media": "./static/ui1.png", "caption": "编辑器界面" },
            { "media": "./static/ui2.png", "caption": "调试面板" },
            { "media": "./static/ui3.png", "caption": "设置页面" }
          ]
        },
        {
          "template": "stats",
          "style": "accent",
          "title": "关键指标",
          "items": [
            { "value": "10K+", "label": "GitHub Stars" },
            { "value": "500+", "label": "贡献者" },
            { "value": "98%", "label": "满意度" }
          ]
        },
        {
          "template": "quote",
          "style": "double",
          "text": "MyApp 彻底改变了我们的开发流程。",
          "author": "某技术团队负责人"
        },
        {
          "template": "feature-list",
          "style": "solid",
          "title": "技术特性",
          "items": [
            { "icon": "⚡", "title": "极速启动", "desc": "冷启动 < 500ms" },
            { "icon": "🔌", "title": "插件生态", "desc": "200+ 官方插件" },
            { "icon": "🌐", "title": "多语言", "desc": "支持 50+ 编程语言" },
            { "icon": "🛡", "title": "安全", "desc": "SOC2 认证" }
          ]
        },
        {
          "template": "video",
          "style": "rounded",
          "title": "产品演示",
          "text": "3 分钟了解 MyApp 的核心功能",
          "media": "./static/demo.mp4"
        }
      ]
    }
  ],
  "cta": {
    "bg": "",
    "fg": "",
    "title": "立即开始使用 MyApp",
    "subtitle": "开源免费 · 社区活跃 · 持续更新",
    "btnText": "前往 GitHub",
    "features": [
      { "num": "10K+", "lbl": "GitHub Stars" },
      { "num": "500+", "lbl": "贡献者" },
      { "num": "98%", "lbl": "满意度" }
    ]
  },
  "slideOrder": ["cover", "features", "custom:showcase", "cta"],
  "extraSlides": [],
  "customPages": [ /* 如上 */ ],
  "animations": [],
  "cartoonText": {
    "text": "MyApp",
    "color": "#e11d48",
    "position": "bottom-left",
    "anims": ["bounce", "wiggle", "pulse", "spin", "float"]
  }
}
```

---

## 快速参考

**添加一个新的自定义页面：**

1. 在 `customPages` 数组中添加一个对象
2. 设置唯一的 `id`（如 `"my-page"`）
3. 在 `blocks` 中按需添加内容块，每个块指定 `template`、`style` 和对应字段
4. 在 `slideOrder` 中添加 `"custom:my-page"` 控制显示位置

**边框样式速查：**

| `style` 值 | 视觉效果 |
|-------------|----------|
| `solid` | 实线 + 阴影（默认） |
| `dashed` | 虚线，轻量 |
| `double` | 双线，典雅 |
| `rounded` | 圆角，现代 |
| `accent` | 红色强调 + 顶部装饰条 |

**附件类型自动识别：**

| 文件后缀 | 渲染方式 |
|----------|----------|
| `.png` `.jpg` `.jpeg` `.gif` `.webp` `.svg` `.bmp` | 图片 |
| `.mp4` `.webm` `.ogg` `.mov` | 视频播放器 |
| 其他 / 无后缀 | 代码文本块 |
