const REDACTIONS = [
  { pattern: /1[3-9]\d{9}/g, replacement: "[手机号已隐藏]" },
  { pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, replacement: "[邮箱已隐藏]" },
  { pattern: /\b\d{17}[\dXx]\b/g, replacement: "[身份证号已隐藏]" },
  { pattern: /(微信|wx|WeChat|wechat)[:：\s]*[A-Za-z0-9_-]{5,}/gi, replacement: "[微信号已隐藏]" },
  { pattern: /([一-龥]{2,4})(先生|女士|小姐|老师|同学)/g, replacement: "[姓名已隐藏]$2" },
];

export function redactSensitiveText(input) {
  return REDACTIONS.reduce((text, rule) => text.replace(rule.pattern, rule.replacement), input || "");
}

