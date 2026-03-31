#!/bin/bash
# 重跑5所未覆盖高校的爬取
# 前提：主进程已完成，fix_urls_v2.py已运行

DB="data/large_scale_test.db"
LOG="/tmp/rerun_uncovered.log"

echo "$(date) | 开始重跑5所未覆盖高校" | tee $LOG

# Step 1: 运行修复脚本
echo "$(date) | Step 1: 运行fix_urls_v2.py" | tee -a $LOG
.venv/bin/python scripts/fix_urls_v2.py --db $DB 2>&1 | tee -a $LOG

# Step 2: 逐个重跑（跳过兰州大学和山东大学，它们有反爬/SSL问题）
for uni in "天津大学" "哈尔滨工业大学" "西北农林科技大学"; do
    echo "" | tee -a $LOG
    echo "$(date) | 重跑: $uni" | tee -a $LOG
    .venv/bin/python scripts/run_crawl.py --university "$uni" --db $DB --max-pages 3 2>&1 | tee -a $LOG
done

# Step 3: 统计结果
echo "" | tee -a $LOG
echo "$(date) | 最终统计" | tee -a $LOG
sqlite3 $DB "SELECT u.name, COUNT(an.id) as cnt FROM universities u LEFT JOIN admission_notices an ON u.id = an.university_id WHERE u.name IN ('山东大学','哈尔滨工业大学','天津大学','西北农林科技大学','国防科技大学','兰州大学','中央民族大学') GROUP BY u.id ORDER BY cnt DESC;" 2>&1 | tee -a $LOG

echo "" | tee -a $LOG
echo "$(date) | 完成！" | tee -a $LOG
