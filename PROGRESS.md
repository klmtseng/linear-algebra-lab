# PROGRESS

## 2026-07-03 M1:8 關全建成 + Playwright 驗收 PASS
- 骨架:index.html + style.css + js/main.js(零依賴 Canvas 2D)
- 8 關對應 JOHNSON-MATH 線代 EP1–EP3(見 README 對照表)
- 引擎:column-基向量矩陣、格線變形動畫(lerp+ease)、拖曳吸附 0.5 格點、localStorage 進度
- 驗收(Chromium headless):8 關截圖 OK、零 console/page error;互動測試全過
  - L1 拖 v→(3,2) 過關、L3 滑桿命中 (2,3)、L4 四預設、L5 det=0/det<0、
    L6 S→R 合成矩陣 [0 -1; 1 1] 正確+quiz、L7 dot=0 正交、L8 45° 特徵方向 λ≈3
- 已修:tab 標籤改短名、readout 移畫布上方

## 2026-07-03 M1.5:公開上線
- GitHub: https://github.com/klmtseng/linear-algebra-lab (public, noreply email)
- Vercel: https://linear-algebra-lab-tau.vercel.app (git connect 已串,push 即自動重佈)
- 上線驗證:index 200 含「線代實驗室」、js/main.js 200

## 待辦 / Parking lot
- 手機實機驗收(觸控拖曳已用 pointer events + touch-action:none,理論可用)
- 擴充:概率 7 集系列做第二模組(骨架已可重用 tab/goal/進度系統)
- L5 目標「det=0」會在拖曳路過原點時順手達成——若要更有儀式感可改成需停留 0.5s

## 2026-07-03 M2:示範模式(先看示範→換你玩)
- 相機系統(scale/x/y 可補間,toScr/fromScr 改讀 cam)→ 放大縮小動畫
- 示範播放器:宣告式 storyboard(vec/num/cam/mat/call 補間步),字幕層 CSS 淡入淡出
- 8 關各配 5-9 步示範;首次進入未通關自動播;▶ 按鈕重播;點畫布=跳過
- 節制原則:示範中格線降淡聚焦主角;markGoal 停用(示範不代打過關)
- 驗收(Chromium):自動播/相機還原/goal 抑制/跳過/L6 接力同步/L3 滑桿跟動 全 PASS,零 error
