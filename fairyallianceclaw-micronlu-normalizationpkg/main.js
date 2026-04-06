/*
未来之窗 神识 - 蓝莓自动称重版
2026-02-22
可插拔架构 | 蓝莓称重场景
*/

class FAMS_UniversalNLU {
  constructor(config = {}) {
    this.config = {
      lang: 'zh',
      similarityThreshold: 0.7,
      wakeWords: ['唤醒', '小窗', '未来之窗', '东方仙盟'],
      sleepWords: ['休眠', '休息', '退出', '关闭'],
      ...config
    };

    this.industryRules = {};
    this.currentEcoType = null;
    this.wakeStatus = false;
    this.itemsLibrary =['水','可乐','纸巾','拖鞋'];
  }

  injectIndustryRules(ecoType, rules) {
    this.industryRules[ecoType] = rules;
    if (!this.currentEcoType) this.currentEcoType = ecoType;

    const ruleLangs = Object.keys(rules || {});
    if (ruleLangs.includes('zh') && !this.config.manualLang) {
      this.config.lang = 'zh';
    } else if (ruleLangs.includes('en') && !this.config.manualLang) {
      this.config.lang = 'en';
    }

    if (rules.items) this.itemsLibrary = rules.items;
  }

  setCurrentIndustry(ecoType) {
    if (!this.industryRules[ecoType]) throw new Error('不存在该行业');
    this.currentEcoType = ecoType;
  }

  clean(text) {
    return (text || '').toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, ' ').trim();
  }
  
  clean_reserved_num(text) {
      const tempText = text.replace(/(\d)\.(\d)/g, '$1￡$2');
      const cleanTemp = (tempText || '').toLowerCase()
        .replace(/[^\u4e00-\u9fa5a-z0-9\s￡]/g, ' ')
        .trim();
      const finalText = cleanTemp.replace(/￡/g, '.');
      return finalText;
  }

  similarity(a, b) {
    const sa = a || '';
    const sb = b || '';
    const len1 = sa.length;
    const len2 = sb.length;
    const dp = Array.from({ length: len1 + 1 }, () => Array(len2 + 1).fill(0));
    for (let i = 0; i <= len1; i++) dp[i][0] = i;
    for (let j = 0; j <= len2; j++) dp[0][j] = j;
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = sa[i-1] === sb[j-1] ? 0 : 1;
        dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
      }
    }
    const maxLen = Math.max(len1, len2);
    return maxLen === 0 ? 1 : 1 - dp[len1][len2] / maxLen;
  }

  checkWakeSleep(text) {
    const t = this.clean_reserved_num(text);
    let isWake = false;
    let isSleep = false;

    for (const w of this.config.wakeWords) {
      if (t.includes(w) || this.similarity(t, w) >= this.config.similarityThreshold) {
        isWake = true; this.wakeStatus = true; break;
      }
    }
    for (const s of this.config.sleepWords) {
      if (t.includes(s) || this.similarity(t, s) >= this.config.similarityThreshold) {
        isSleep = true; this.wakeStatus = false; break;
      }
    }
    return { wake: isWake, sleep: isSleep };
  }

  extractParams(text, rule) {
    const p = {
      row: null,
      index: null,
      boxType: null,
      boxCount: null,
      query: null,
      room: null,
      item: null,
      name: null,
      money: null,
      num:0
    };

    if (rule?.needRow) {
      const rowMatch = text.match(/(\d+)(?:行|条|列|排)/);
      p.row = rowMatch ? rowMatch[1] : null;
    }

    if (rule?.needIndex) { 
      const indexMatch = text.match(/第(\d+)(?:个|条|列|行)/);
      p.index = indexMatch ? indexMatch[1] : null;
    }

    if (rule?.needBox) {
      const boxMatch1 = text.match(/([^\d]+)(\d+)个/);
      const boxMatch2 = text.match(/(\d+)个([^\d]+)/);
      if (boxMatch1) {
        p.boxType = boxMatch1[1].trim();
        p.boxCount = boxMatch1[2];
      } else if (boxMatch2) {
        p.boxType = boxMatch2[2].trim();
        p.boxCount = boxMatch2[1];
      }
    }
    
    if (rule?.needRoom) {
      const m = text.match(/\b\d{3,5}\b/);
      p.room = m ? m[0] : null;
    }

    if (rule?.needMoney) {
      const m = text.match(/\d+/);
      p.money = m ? m[0] : null;
    }

    if (rule?.needQuery) {
      let s = text;
      (rule.coreKeywords || []).forEach(kw => {
        s = s.replace(kw, '').trim();
      });
      p.query = s || null;
    }

    if (rule?.needItem) {
      const items =this.itemsLibrary;  
      p.item = items.find(i => text.includes(i)) || null;
    }
    
    if (rule?.needPage) { 
      const indexMatch = text.match(/第(\d+)(?:页|张|篇)/);
      p.index = indexMatch ? indexMatch[1] : null;
    }

    return p;
  }

  start(text) {
    const cleanText = this.clean_reserved_num(text);
    const sentences = this.splitSentences(cleanText);
    const rules = this.industryRules[this.currentEcoType]?.[this.config.lang] || [];
    const result = [];

    for (const sen of sentences) {
      const { wake, sleep } = this.checkWakeSleep(sen);
      let bestScore = 0;
      let bestRule = null;
      let hitKeyword = '';

      for (const rule of rules) {
        let score = 0;
        const core = rule.coreKeywords || rule.keywords || [];
        let currentHit = '';
        for (const kw of core) {
          if (sen.includes(kw)) {
              score += 10; 
              currentHit = kw;
              break; 
          }
        }

        const minor = rule.minorKeywords || [];
        for (const kw of minor) {
          if (this.similarity(sen, kw) >= this.config.similarityThreshold) score += 2;
        }

        if (score > 0) {
          const p = this.extractParams(sen, rule);
          if (rule.needRow && p.row) score += 3;
          if (rule.needIndex && p.index) score += 3;
          if (rule.needBox && p.boxType && p.boxCount) score += 3;
        }

        if (score > bestScore) {
          bestScore = score;
          bestRule = rule;
          hitKeyword = currentHit;
        }
      }

      const intent = bestRule ? bestRule.intent : 'Unknown';
      const baseParams = this.extractParams(sen, bestRule);
      const groupParams = bestRule?.group ? this.extractByGroup(sen, bestRule.group) : {};
      
      let stripCutting = hitKeyword;
      if (bestRule?.hitEntityStrip){
          const stripTriggerStr = String(bestRule.striptrigger).trim();
          if(bestRule.hitEntityStrip && stripTriggerStr){
              stripCutting =hitKeyword.replace(stripTriggerStr, '').trim();
          }
      }
      
      const param = { 
          ...baseParams, 
          ...groupParams ,
          hitEntity: hitKeyword,
          strippedEntity: stripCutting,
          Entity:stripCutting
      };

      result.push({
        eco_type: this.currentEcoType,
        intent: intent,
        param: param,
        time: null,
        wake: wake,
        sleep: sleep,
        text: sen,
        group: bestRule?.group || null,
        hitEntity: hitKeyword,
        strippedEntity:  stripCutting,
        Entity:stripCutting
      });
    }
    return result;
  }
  
  setItems(list) { this.itemsLibrary = list; }
  
  convertChineseToDigit(text) {
    if (!text) return text;
    return text
      .replace(/两/g,'2').replace(/一/g,'1').replace(/二/g,'2')
      .replace(/三/g,'3').replace(/四/g,'4').replace(/五/g,'5')
      .replace(/六/g,'6').replace(/七/g,'7').replace(/八/g,'8')
      .replace(/九/g,'9').replace(/零/g,'0')
      .replace(/壹/g,'1').replace(/贰/g,'2').replace(/叁/g,'3');
  }
  
  数字归一化(text){
      return this.convertChineseToDigit(text);
  }
  
  extractByGroup(text, group) {
    const res = {
      goodsName: null,
      unitPrice: null,
      num: null,
      memberText: null,
      query: null
    };

    if (group === 'vegetableWeight') {
      res.goodsName = this.itemsLibrary.find(g => text.toLowerCase().includes(g.toLowerCase())) || null;
      
      let unitPriceMatch = null;
      if (this.config.lang === 'zh') {
        unitPriceMatch = text.match(/(\d+(?:\.\d+)?)\s*(块|元|钱)/);
      } else if (this.config.lang === 'en') {
        unitPriceMatch = text.match(/(\d+(?:\.\d+)?)\s*(yuan|dollar|rmb)|(\d+(?:\.\d+)?)\s*yuan per jin/);
        unitPriceMatch = unitPriceMatch ? (unitPriceMatch[1] || unitPriceMatch[3]) : null;
        if (unitPriceMatch) unitPriceMatch = [null, unitPriceMatch];
      }
      res.unitPrice = unitPriceMatch ? unitPriceMatch[1] : null;
      
      let numMatch = null;
      if (this.config.lang === 'zh') {
        numMatch = text.match(/(买|来|称|要)\s*(\d+(?:\.\d+)?)\s*斤/);
        res.num = numMatch ? Number(numMatch[2]) : null;
      } else if (this.config.lang === 'en') {
        numMatch = text.match(/(take|buy|get)\s*(\d+(?:\.\d+)?)\s*jin|(\d+(?:\.\d+)?)\s*jin/);
        const numValue = numMatch ? (numMatch[2] || numMatch[3]) : null;
        res.num = numValue ? Number(numValue) : null;
      }
      
      return res;
    }

    if (group === 'searchMember') {
      let memberText = text.replace(/查会员|查询会员/g, '').trim();
      res.query = memberText || null;
      return res;
    }
    
    if (group === 'clothCount') {
      res.goodsName = this.itemsLibrary.find(g => text.includes(g)) || null;
      const q = text.match(/(\d+(?:\.\d+)?)/);
      res.num = q ? q[1] : null;
      return res;
    }

    return res;
  }
  
  splitSentences(text) {
      const 断言=text.split(/(?<!\d|[a-zA-Z])[。！？,!?]|\.(?!\d|[a-zA-Z])/).filter(Boolean)
      return 断言;
  }

  setLang(lang, manual = true) {
    if (['zh', 'en'].includes(lang)) {
      this.config.lang = lang;
      this.config.manualLang = manual;
    }
  }

  getCurrentLang() {
    return this.config.lang;
  }
}

module.exports = FAMS_UniversalNLU;
