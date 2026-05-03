#!/usr/bin/env python3
"""Generate seed SQL and JSON from the docx-converted text file using line-by-line parsing."""
import json

with open("/tmp/sentences_full.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()

module_names = [
    "核心动词升维",
    "精准形容词与副词替换",
    "高级逻辑连接词与过渡网络",
    "学术论证与思辨框架",
    "复杂句法多样性与长难句搭建",
]

mod_prefixes = {
    "核心动词升维": "m1",
    "精准形容词与副词替换": "m2",
    "高级逻辑连接词与过渡网络": "m3",
    "学术论证与思辨框架": "m4",
    "复杂句法多样性与长难句搭建": "m5",
}

# Find start of 100 sentences section
start_line = None
for i, line in enumerate(lines):
    if "扩充语料库：100个" in line:
        start_line = i
        break

if start_line is None:
    print("ERROR: Could not find start marker")
    exit(1)

# Find all module header lines
modules_order = []
for i in range(start_line, len(lines)):
    line = lines[i].strip()
    for mod in module_names:
        if mod in line and "模块" in line:
            modules_order.append((i, mod))

sentences = []
current_module = module_names[0]
module_counter = {m: 0 for m in module_names}
current_num = None
current_chinese = None
current_english = None

i = start_line
while i < len(lines):
    line = lines[i].strip()
    
    # Check for module change
    for mod in module_names:
        if mod in line and ("模块" in line):
            current_module = mod
            break
    
    # Check if line starts with a number like "1. " through "100. "
    import re
    m = re.match(r'^(\d{1,3})\.\s+(.+)$', line)
    if m:
        num = int(m.group(1))
        rest = m.group(2).strip()
        
        # Skip section headers (like "1. 强调xx", "2. 描述xx")
        is_header = any(kw in rest for kw in [
            "语境呈现", "高阶表达", "滥用基础动词", "形容词和副词", 
            "逻辑过渡词", "美国 CCSS", "根据考纲", "强调", "描述",
            "展现", "情感", "主观"
        ])
        
        if not is_header and 1 <= num <= 100:
            current_num = num
            current_chinese = rest
            
            # Next non-empty line should be the English sentence
            j = i + 1
            while j < len(lines) and lines[j].strip() == "":
                j += 1
            if j < len(lines):
                current_english = lines[j].strip()
            
            # Find the analysis (lines after "【语言点深度解析】")
            analysis_lines = []
            k = j
            found_analysis = False
            while k < len(lines):
                aline = lines[k].strip()
                if "【语言点深度解析】" in aline:
                    found_analysis = True
                    # Get the part after 】
                    idx = aline.find("】")
                    if idx != -1:
                        content = aline[idx+1:].strip()
                        # Remove leading ： or :
                        if content.startswith("：") or content.startswith(":"):
                            content = content[1:].strip()
                        if content:
                            analysis_lines.append(content)
                elif found_analysis:
                    # Check if next line is a new sentence number
                    if re.match(r'^\d+\.\s+', aline):
                        break
                    # Also break at module headers
                    for mod in module_names:
                        if mod in aline and "模块" in aline:
                            found_analysis = False
                            break
                    if not found_analysis:
                        break
                    if aline:
                        analysis_lines.append(aline)
                k += 1
            
            analysis_full = " ".join(analysis_lines).strip()
            
            # Only add if we have valid data
            if current_chinese and current_english and analysis_full:
                module_counter[current_module] += 1
                idx = module_counter[current_module]
                prefix = mod_prefixes[current_module]
                sid = f"{prefix}-{idx:02d}"
                
                # Extract tier1 warning
                tw = ""
                tw_match = re.search(r"替换\s+(.+?)[。.]", analysis_full)
                if tw_match:
                    tw = tw_match.group(1).strip()
                
                # Clean analysis
                analysis_clean = re.sub(r"\s+\d+$", "", analysis_full).strip()
                analysis_clean = re.sub(r"\s*\[cite:\s*\d+\]", "", analysis_clean).strip()
                
                sentences.append({
                    "id": sid,
                    "module": current_module,
                    "chineseContext": current_chinese,
                    "targetSentence": current_english,
                    "tier1Warning": tw,
                    "deepAnalysis": analysis_clean
                })
    
    i += 1

print(f"Parsed {len(sentences)} sentences")
for s in sentences[:3]:
    print(f"  {s['id']}: [{s['module']}] {s['chineseContext']}")
for s in sentences[-3:]:
    print(f"  {s['id']}: [{s['module']}] {s['chineseContext']}")
for mod in module_names:
    print(f"  {mod}: {module_counter[mod]} sentences")

assert len(sentences) == 100, f"Expected 100, got {len(sentences)}"

# Write JSON
with open("lib/sentences.json", "w", encoding="utf-8") as f:
    json.dump(sentences, f, ensure_ascii=False, indent=2)
print("Written to lib/sentences.json")

# Write SQL
def esc(s):
    return s.replace("'", "''")

with open("supabase/migrations/002_seed_sentences.sql", "w", encoding="utf-8") as f:
    f.write("-- 100句核心语料数据\n")
    f.write("INSERT INTO sentences (id, module, chinese_context, target_sentence, tier1_warning, deep_analysis) VALUES\n")
    values = []
    for s in sentences:
        values.append(f"  ('{s['id']}', '{esc(s['module'])}', '{esc(s['chineseContext'])}', '{esc(s['targetSentence'])}', '{esc(s['tier1Warning'])}', '{esc(s['deepAnalysis'])}')")
    f.write(",\n".join(values))
    f.write("\nON CONFLICT (id) DO UPDATE SET\n")
    f.write("  module = EXCLUDED.module,\n")
    f.write("  chinese_context = EXCLUDED.chinese_context,\n")
    f.write("  target_sentence = EXCLUDED.target_sentence,\n")
    f.write("  tier1_warning = EXCLUDED.tier1_warning,\n")
    f.write("  deep_analysis = EXCLUDED.deep_analysis;\n")
print("Written to supabase/migrations/002_seed_sentences.sql")
