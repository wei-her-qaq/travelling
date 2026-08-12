# AGENTS.md

## 项目概述

魔女之旅（Majo no Tabitabi）粉丝站，纯静态 HTML + Vanilla JS 单页应用，内置 EPUB 在线阅读器。

## 开发命令

```bash
# 安装依赖
uv sync

# 构建（预提取 EPUB 为静态文件）
uv run python3 build.py

# 更新依赖后导出 requirements.txt
uv export > requirements.txt

# 本地预览构建产物
npx serve dist
```

## 项目结构

```
├── index.html          # 主页面（纯静态，无框架）
├── style.css           # 样式
├── script.js           # 应用逻辑（阅读器 / 轮播 / 动画等）
├── books.js            # 占位文件（运行时由 api/books.json 填充）
├── build.py            # 构建脚本
├── pyproject.toml      # Python 依赖声明
├── requirements.txt    # 锁定的依赖导出
├── server.ps1          # 原始 PowerShell 服务器（已废弃，仅作参考）
├── books/              # 源 EPUB 文件 + 封面
│   ├── *.epub          # 25 册轻小说
│   └── covers/
├── images/             # 站点图片资源
└── dist/               # 构建产物，可直接部署到静态托管
```

## 构建流程

`build.py` 将 `server.ps1` 的运行时 EPUB 解析变为构建时预处理：

1. 复制静态资源（images, style.css, index.html, EPUB 文件）
2. 使用 `ebooklib` 解析每本 EPUB，提取元数据和章节
3. 将章节内图片转为 base64 data URI 内联到 HTML
4. 生成 `api/books.json`、`api/book/{file}/chapters.json`、`api/book/{file}/chapter/{id}.html`
5. 修改 `script.js` 中的 fetch 路径，指向静态 JSON/HTML 文件
6. 统一封面图片格式为 `.jpg`

## 注意事项

- `server.ps1` 已废弃，所有 EPUB 解析逻辑已迁移至 `build.py`
- 构建产物 `dist/` 完全不依赖服务端，可以直接部署到 Cloudflare Pages / Vercel / Netlify 等静态托管
- 新增 EPUB 文件：放到 `books/`，对应封面放到 `books/covers/`（命名 `book_XX.epub` → `cover_XX.jpg`），重新运行 `build.py` 即可
- **修改 `pyproject.toml` 依赖后，务必执行 `uv export > requirements.txt` 保持同步，否则构建将会失败！！！**
- 章节内容使用 `BeautifulSoup('xml')` 解析 XHTML，epub 内图片通过 base64 内联避免外部请求
