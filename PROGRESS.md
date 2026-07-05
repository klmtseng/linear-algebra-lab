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

## 2026-07-06 M3:第二科目「機率與統計」(4 關)
- 頂部科目切換(線性代數 / 機率與統計),各自 tab/goal/示範/進度,共用引擎
- 引擎擴充:draggable 支援螢幕座標(getScreen/setScreen)、示範播放器加 num2 補間
- 機率 4 關(自寫 2D 繪圖,不經向量座標系),對應 JOHNSON-MATH 概率 EP04-07:
  - P1 機率密度=麵粉撒桌:拖 a/b 門檻線框面積=P(a<X<b),單點為 0
  - P2 正態分佈:μ/σ 滑桿 + 68-95-99.7 陰影
  - P3 健檢偽陽性:自然頻率方格(有病/健康雙欄+PPV 條),盛行率崩 PPV
  - P4 貝氏更新:先驗→按陽性/陰性→後驗信念條+證據序列
- 驗收(Chromium):科目切換、4 關互動+goal、示範自動播/跳過、切回線代 全 PASS,零 error
- 專案已更名「數感實驗室 Math Lab」(repo/網址不變)

## 2026-07-06 M4:補齊兩科目(線代 8→11、機率 4→7,共 18 關)
- 線代進階 3 關:
  - L9 投影矩陣:投影到直線,影子=v / 影子=0(v⊥d);P=ddᵀ/dᵀd
  - L10 基變換:同一 v 在斜基底下的座標 [v]_B=B⁻¹v,命中 (1,2)+斜基底
  - L11 SVD 奇異值:單位圓→橢圓,σ₁σ₂=|det|;做出正圓(σ₁=σ₂)/塌陷(σ₂=0,秩1)
- 機率補完 3 關:
  - P5 期望值:分布重心(三角支點),灌鉛滑桿推 E[X] 到兩端
  - P6 大數法則:累積平均擲骰收斂到 3.5,早期震盪 vs 500+ 收斂
  - P7 中心極限定理:N 顆骰和(精確卷積)→鐘形,疊理論正態曲線
- 修:L10 初始 v 誤觸過關(改起點非星星,demo reset 同步)
- 驗收(Chromium):6 新關互動+goal+示範全 PASS,零 error

## 2026-07-06 M5:再補 4 關(線代 11→13、機率 7→9,共 22 關)
- 線代:
  - L12 零空間/行空間:塌陷後行空間(金線)+零空間(紫虛線),秩-零化度;拖 u 使 A·u=0
  - L13 馬可夫鏈穩態:2 態轉移矩陣迭代→收斂到穩態(λ=1 特徵向量),與初始無關;軌跡圖+穩態線
- 機率:
  - P8 樣本空間與加法法則:兩圓 Venn,P(A∪B)=P(A)+P(B)−P(A∩B),互斥/重疊;lensArea 精確交集
  - P9 條件機率:把世界縮到 B(框外壓暗+剪裁高亮 A∩B),P(A|B)=P(A∩B)/P(B);A⊆B / P(A|B)=0
- 引擎:新增 lensArea/drawDisc 幾何helper;沿用螢幕座標 draggable
- 驗收(Chromium):4 新關互動+goal 全 PASS,零 error(P8/P9 早期測試失敗是測試座標 stale,非功能問題)
