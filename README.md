# FairyAllianceClaw_MicroNLU_NormalizationPKG 归一化工具包
未来之窗 神识 - 蓝莓自动称重版 | 通用自然语言理解 & 文本归一化 JS 工具

## 功能
- 文本清洗（保留小数点、过滤特殊符号）
- 唤醒/休眠词检测
- 编辑距离相似度计算
- 句子智能切分（不拆分小数点）
- 行业规则注入
- 参数提取（行、数量、房间、金额、商品）
- 中文数字转阿拉伯数字
- 会员/称重/计数场景解析
- 标准输出格式

## 运行环境
Node.js >= 14

## 使用
const FAMS_UniversalNLU = require('./main.js');
const nlu = new FAMS_UniversalNLU();
