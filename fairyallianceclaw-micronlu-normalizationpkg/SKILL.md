---
name: fairyallianceclaw-micronlu-normalizationpkg
displayName: 神识通用NLU归一化包
version: 1.0.0
description: JS版自然语言理解、文本清洗、参数提取、意图解析、称重场景适配工具 FairyAllianceClaw_MicroNLU_NormalizationPKG
author: 未来之窗 神识
license: MIT
tags: [NLU, 自然语言处理, 文本归一化, 意图解析, 称重]
trigger:
  - 文本清洗
  - 自然语言理解
  - NLU
  - 参数提取
  - 称重解析
  - 神识
entry: main.js
runtime: node
---

## 技能说明
未来之窗 神识 - 蓝莓自动称重版 NLU 核心引擎
支持：
- 文本清洗（保留合法小数点）
- 唤醒词/休眠词检测
- 句子切分
- 相似度匹配
- 行业规则注入
- 商品/数量/单价/房间号/会员查询解析
- 标准结构化输出

## 输出格式
[
  {
    "eco_type": "当前行业",
    "intent": "意图",
    "param": { 参数 },
    "wake": true/false,
    "sleep": true/false,
    "text": "原句子"
  }
]
