/**
 * 高校校徽 Logo URL 映射
 * 使用教育部公开的高校标识或公共图片源
 * 找不到的学校回退到首字母头像
 */

const LOGO_MAP: Record<string, string> = {
  "北京大学": "https://static.wikia.nocookie.net/logopedia/images/8/80/Peking_University_seal.svg",
  "清华大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Tsinghua_University_Logo.svg/200px-Tsinghua_University_Logo.svg.png",
  "浙江大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Zhejiang_University_Logo.svg/200px-Zhejiang_University_Logo.svg.png",
  "复旦大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Fudan_University_Logo.svg/200px-Fudan_University_Logo.svg.png",
  "上海交通大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Shanghai_Jiao_Tong_University_Logo.svg/200px-Shanghai_Jiao_Tong_University_Logo.svg.png",
  "南京大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Nanjing_University_Logo.svg/200px-Nanjing_University_Logo.svg.png",
  "武汉大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Wuhan_University_Logo.svg/200px-Wuhan_University_Logo.svg.png",
  "中山大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Sun_Yat-sen_University_Logo.svg/200px-Sun_Yat-sen_University_Logo.svg.png",
  "哈尔滨工业大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Harbin_Institute_of_Technology_Logo.svg/200px-Harbin_Institute_of_Technology_Logo.svg.png",
  "中国科学技术大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/USTC_logo.svg/200px-USTC_logo.svg.png",
  "四川大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Sichuan_University_Logo.svg/200px-Sichuan_University_Logo.svg.png",
  "西安交通大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Xi%27an_Jiaotong_University_Logo.svg/200px-Xi%27an_Jiaotong_University_Logo.svg.png",
  "华中科技大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/HUST_logo.svg/200px-HUST_logo.svg.png",
  "同济大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Tongji_University_Emblem.svg/200px-Tongji_University_Emblem.svg.png",
  "北京航空航天大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/BUAA_logo.svg/200px-BUAA_logo.svg.png",
  "北京理工大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/BIT_logo.svg/200px-BIT_logo.svg.png",
  "天津大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Tianjin_University_Logo.svg/200px-Tianjin_University_Logo.svg.png",
  "南开大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Nankai_University_Logo.svg/200px-Nankai_University_Logo.svg.png",
  "中国人民大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Renmin_University_of_China_Logo.svg/200px-Renmin_University_of_China_Logo.svg.png",
  "东南大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/Southeast_University_Logo.svg/200px-Southeast_University_Logo.svg.png",
  "厦门大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Xiamen_University_Logo.svg/200px-Xiamen_University_Logo.svg.png",
  "山东大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Shandong_University_Logo.svg/200px-Shandong_University_Logo.svg.png",
  "大连理工大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/DUT_logo.svg/200px-DUT_logo.svg.png",
  "吉林大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Jilin_University_Logo.svg/200px-Jilin_University_Logo.svg.png",
  "电子科技大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/UESTC_logo.svg/200px-UESTC_logo.svg.png",
  "华南理工大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/SCUT_logo.svg/200px-SCUT_logo.svg.png",
  "中南大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Central_South_University_Logo.svg/200px-Central_South_University_Logo.svg.png",
  "湖南大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Hunan_University_Logo.svg/200px-Hunan_University_Logo.svg.png",
  "重庆大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Chongqing_University_Logo.svg/200px-Chongqing_University_Logo.svg.png",
  "兰州大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Lanzhou_University_Logo.svg/200px-Lanzhou_University_Logo.svg.png",
  "西北工业大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/NPU_logo.svg/200px-NPU_logo.svg.png",
  "北京邮电大学": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/BUPT_logo.svg/200px-BUPT_logo.svg.png",
};

export function getSchoolLogoUrl(name: string): string | null {
  return LOGO_MAP[name] || null;
}
