"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import * as Matter from "matter-js";
import { Sparkles, ArrowDownToLine, RefreshCw } from "lucide-react";
import ShareButton from "../components/ShareButton";

const INITIAL_MONEY = 1500000;

// ピンの設定（絶望の階層構造）
const PIN_TYPES = [
  { label: "一次請け(大手SIer)", deduction: 300000, color: "#3b82f6", radius: 18, tier: 1 },
  { label: "二次請け(中堅)", deduction: 150000, color: "#8b5cf6", radius: 14, tier: 2 },
  { label: "自社営業/ピンハネ", deduction: 80000, color: "#ec4899", radius: 12, tier: 3 },
  { label: "謎の調整金/事務費", deduction: 30000, color: "#ef4444", radius: 10, tier: 4 },
];

interface Effect {
  id: number;
  x: number;
  y: number;
  text: string;
}

// ----------------------------------------------------------------------------
// GameCanvas コンポーネント (Matter.js 描画ロジックを分離)
// ----------------------------------------------------------------------------
const GameCanvas = ({ 
  gameState, 
  onCollision, 
  onTaxZone, 
  onFinish, 
  dropX, 
  money,
  effects,
  onResetReady 
}: { 
  gameState: "idle" | "playing" | "finished",
  onCollision: (deduction: number, pos: { x: number, y: number }) => void,
  onTaxZone: () => void,
  onFinish: () => void,
  dropX: number,
  money: number,
  effects: Effect[],
  onResetReady: (engine: Matter.Engine) => void
}) => {
  const sceneRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const ballRef = useRef<Matter.Body | null>(null);
  const effectIdRef = useRef(0);

  const cw = 390;
  const ch = 700;

  // 初期化（Matter.js）
  useEffect(() => {
    if (!sceneRef.current) return;

    const { Engine, Render, Runner, World, Bodies, Body, Events, Composite } = Matter;

    const engine = Engine.create();
    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: cw,
        height: ch,
        wireframes: false,
        background: "transparent",
      },
    });

    // 壁
    const walls = [
      Bodies.rectangle(cw / 2, -50, cw, 100, { isStatic: true, label: "ceiling", friction: 0 }),
      Bodies.rectangle(-25, ch / 2, 50, ch * 2, { isStatic: true, label: "wall_left", friction: 0 }),
      Bodies.rectangle(cw + 25, ch / 2, 50, ch * 2, { isStatic: true, label: "wall_right", friction: 0 }),
      Bodies.rectangle(cw / 2, ch + 25, cw * 2, 50, { isStatic: true, label: "ground", friction: 0 }),
    ];
    World.add(engine.world, walls);

    // 税金ゾーン
    const taxZone = Bodies.rectangle(cw / 2, ch - 80, cw - 40, 20, {
      isStatic: true,
      isSensor: true,
      label: "tax_zone",
      render: { fillStyle: "rgba(239, 68, 68, 0.3)", strokeStyle: "#ef4444", lineWidth: 2 },
    });
    World.add(engine.world, taxZone);

    // 衝突検知
    Events.on(engine, "collisionStart", (event) => {
      const pairs = event.pairs;
      for (let i = 0; i < pairs.length; i++) {
        const { bodyA, bodyB } = pairs[i];
        const ball = bodyA.label === "ball" ? bodyA : bodyB.label === "ball" ? bodyB : null;
        const other = bodyA.label === "ball" ? bodyB : bodyA;

        if (ball && other.label.startsWith("pin_")) {
          const deduction = parseInt(other.label.split("_")[1], 10);
          onCollision(deduction, { x: ball.position.x, y: ball.position.y });
          Composite.remove(engine.world, other);
        } else if (ball && other.label === "tax_zone") {
          onTaxZone();
          other.label = "tax_zone_done";
          Matter.Body.scale(ball, 0.8, 0.8);
          ball.render.fillStyle = "#451a03"; 
        } else if (ball && other.label === "ground") {
          onFinish();
        }
      }
    });

    // 詰まり防止
    Events.on(engine, "beforeUpdate", () => {
      if (ballRef.current) {
        const b = ballRef.current;
        const vel = b.velocity;
        const speedSq = vel.x * vel.x + vel.y * vel.y;
        if (speedSq < 0.1 && b.position.y < ch - 100) {
          Matter.Body.applyForce(b, b.position, { x: (Math.random() - 0.5) * 0.005, y: 0.002 });
        }
      }
    });

    Render.run(render);
    const runner = Runner.create();
    Runner.run(runner, engine);

    engineRef.current = engine;
    onResetReady(engine);

    return () => {
      Render.stop(render);
      Runner.stop(runner);
      if (render.canvas) render.canvas.remove();
      World.clear(engine.world, false);
      Engine.clear(engine);
    };
  }, []);

  // ボール注入の命令を監視
  useEffect(() => {
    if (gameState === "playing" && !ballRef.current && engineRef.current) {
      const dropXPos = (dropX / 100) * (cw - 60) + 30 + (Math.random() - 0.5) * 20;
      const ball = Matter.Bodies.circle(dropXPos, 30, 20, {
        label: "ball",
        restitution: 0.8,
        friction: 0,
        frictionAir: 0.02,
        density: 0.04,
        render: { fillStyle: "#fbbf24", strokeStyle: "#f59e0b", lineWidth: 3 },
      });
      ballRef.current = ball;
      Matter.World.add(engineRef.current.world, ball);
    } else if (gameState === "idle" && ballRef.current) {
      if (engineRef.current) Matter.Composite.remove(engineRef.current.world, ballRef.current);
      ballRef.current = null;
    }
  }, [gameState]);

  return (
    <div className="relative w-[400px] h-[720px] p-2 bg-zinc-900 rounded-[2.5rem] border-[6px] border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,1),0_0_20px_rgba(34,211,238,0.2)] overflow-hidden">
      {/* 筐体のネオン管演出 */}
      <div className="absolute inset-0 border-2 border-cyan-500/20 rounded-[2.2rem] pointer-events-none z-10" />
      <div className="absolute -inset-1 border border-cyan-400/10 rounded-[2.6rem] blur-sm pointer-events-none" />

      <div className="relative w-full h-full rounded-[2rem] overflow-hidden bg-black/80 bg-cyber-grid">
        <div ref={sceneRef} className="absolute inset-0" />
        
        {/* 落下位置のプレビュー */}
        {gameState === "idle" && (
          <div 
            className="absolute top-4 w-12 h-12 border-4 border-amber-400/50 rounded-full flex items-center justify-center animate-pulse shadow-[0_0_15px_rgba(251,191,36,0.5)]"
            style={{ left: `${dropX}%`, transform: 'translateX(-50%)' }}
          >
            <span className="text-amber-400 text-xs font-black">{(INITIAL_MONEY/10000)}万</span>
          </div>
        )}

        {/* 税金ゾーンのよりリッチな警告 */}
        <div className="absolute bottom-[80px] left-0 w-full flex justify-center pointer-events-none">
          <div className="px-6 py-2 bg-red-950/90 border-y-2 border-red-500/50 flex flex-col items-center gap-1 backdrop-blur-md">
            <span className="text-[10px] text-red-400 font-black tracking-[0.3em] uppercase">Security & Tax Barrier</span>
            <span className="text-xs text-white font-black">絶対防衛線：税金・社会保険料 (-20%)</span>
          </div>
        </div>

        {/* 下部の最終地点ラベル */}
        <div className="absolute bottom-4 left-0 w-full text-center pointer-events-none">
          <span className="text-zinc-600 text-[10px] font-black tracking-[0.5em] uppercase opacity-50">
            Final Destination / Engineer Account
          </span>
        </div>

        {/* 衝突ポップアップエフェクト */}
        {effects.map((ef) => (
          <div
            key={ef.id}
            className="absolute text-rose-500 font-black text-2xl pointer-events-none animate-float-up whitespace-nowrap z-20 neon-text-rose"
            style={{ left: ef.x, top: ef.y }}
          >
            {ef.text}
          </div>
        ))}
      </div>
    </div>
  );
};


// ----------------------------------------------------------------------------
// メイン Home コンポーネント
// ----------------------------------------------------------------------------
export default function Home() {
  const engineInstanceRef = useRef<Matter.Engine | null>(null);

  // ゲームステート
  const [gameState, setGameState] = useState<"idle" | "playing" | "finished">("idle");
  const [money, setMoney] = useState(INITIAL_MONEY);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [dropX, setDropX] = useState(50);
  const effectIdRef = useRef(0);

  // ピン生成ロジック (GameCanvas外で管理)
  const generatePinsInternal = (engine: Matter.Engine) => {
    const { World, Bodies, Composite } = Matter;
    const cw = 390;
    const existingPins = Composite.allBodies(engine.world).filter(b => b.label.startsWith('pin_'));
    Composite.remove(engine.world, existingPins);

    const pins: Matter.Body[] = [];
    const addPin = (typeIndex: number, x: number, y: number) => {
      if (x < 10 || x > cw - 10) return;
      const type = PIN_TYPES[typeIndex];
      pins.push(Bodies.circle(x, y, type.radius, {
        isStatic: true, restitution: 1.0, friction: 0, label: `pin_${type.deduction}`,
        render: { fillStyle: type.color, strokeStyle: "#fff", lineWidth: 2 }
      }));
    };

    const patternType = Math.floor(Math.random() * 8); 
    switch (patternType) {
      case 0: // スタンダード
        for (let r = 0; r < 10; r++) {
          const cols = r % 2 === 0 ? 5 : 6;
          const spacingX = cw / 6;
          const startX = r % 2 === 0 ? spacingX : spacingX / 2;
          for (let c = 0; c < cols; c++) {
            let idx = r < 3 ? 0 : (r < 6 ? 1 : (Math.random() > 0.5 ? 2 : 3));
            addPin(idx, startX + c * spacingX + (Math.random()-0.5)*20, 140 + r * 60);
          }
        }
        break;
      case 1: // V字
        for (let r = 0; r < 9; r++) {
          const gap = Math.max(30, 160 - r * 15);
          addPin(r < 3 ? 0 : 1, cw/2 - gap, 150 + r * 55);
          addPin(r < 3 ? 0 : 1, cw/2 + gap, 150 + r * 55);
          if (r > 4 && r % 2 === 0) addPin(3, cw / 2, 175 + r * 55);
        }
        break;
      case 5: // 回廊
        for (let r = 0; r < 10; r++) {
          addPin(0, 40, 140 + r * 55);
          addPin(0, cw - 40, 140 + r * 55);
          if (r > 3 && Math.random() > 0.2) addPin(r < 7 ? 1 : 2, cw/2 + (Math.random()-0.5)*60, 150 + r * 55);
        }
        break;
      default: // 乱立その他
        for (let i = 0; i < 45; i++) {
          const y = 140 + Math.random() * 420;
          addPin(y < 250 ? 0 : (y < 400 ? 1 : 2), 30 + Math.random()*(cw-60), y);
        }
    }
    // 端抜け防止
    for (let y = 150; y < 600; y += 100) {
      addPin(0, 15, y);
      addPin(0, cw - 15, y);
    }
    World.add(engine.world, pins);
  };

  const handleCollision = (baseDeduction: number, pos: { x: number, y: number }) => {
    setMoney((prev) => {
      const hardFloor = 100000;
      if (prev <= hardFloor) return Math.max(hardFloor - 2000, prev - 200);
      let actual = baseDeduction;
      if (prev < 300000) actual = Math.floor(baseDeduction * 0.3) + 1000;
      else if (prev < 600000) actual = Math.floor(baseDeduction * 0.6) + 5000;
      return Math.max(hardFloor, prev - actual);
    });

    const id = effectIdRef.current++;
    setEffects((prev) => {
      let val = baseDeduction;
      if (money < 300000) val = Math.floor(baseDeduction * 0.3) + 1000;
      else if (money < 600000) val = Math.floor(baseDeduction * 0.6) + 5000;
      return [...prev, { id, x: pos.x, y: pos.y - 20, text: `-${(val/10000).toFixed(1)}万` }];
    });
    setTimeout(() => setEffects((prev) => prev.filter((e) => e.id !== id)), 1000);
  };

  const handleTaxZone = () => {
    setMoney((prev) => {
      const deduction = Math.floor(prev * 0.2);
      const id = effectIdRef.current++;
      setEffects((eff) => [...eff, { id, x: 195, y: 550, text: `税金等 -${(deduction/10000).toFixed(1)}万` }]);
      setTimeout(() => setEffects((eff) => eff.filter((e) => e.id !== id)), 1500);
      return prev - deduction;
    });
  };

  const handleFinish = () => setGameState("finished");

  const handleDrop = () => {
    if (gameState !== "idle") return;
    setGameState("playing");
    setMoney(INITIAL_MONEY);
    setEffects([]);
  };

  const resetGame = () => {
    setGameState("idle");
    setMoney(INITIAL_MONEY);
    if (engineInstanceRef.current) generatePinsInternal(engineInstanceRef.current);
  };

  const deductionRate = (((INITIAL_MONEY - money) / INITIAL_MONEY) * 100).toFixed(1);

  // 金額に応じた絶望コメント
  const evaluationComment = useMemo(() => {
    if (money < 200000) return "「君の代わりはいくらでもいるから😊」\n(評価C: 業界の養分)";
    if (money < 250000) return "「経験積めるから実質プラスだよね？😉」\n(評価B: 従順なソルジャー)";
    if (money < 300000) return "「今回は頑張って単価交渉しといたよ！🫡」\n(評価A: 標準的なエンジニア)";
    return "「フリーランスになった方がいいのでは？🤔」\n(評価S: 奇跡の生存者)";
  }, [money]);

  return (
    <main className="cyber-container">
      {/* 背景エフェクト */}
      <div className="cyber-grid" />
      <div className="scanlines" />

      <div className="cyber-wrapper">
        
        {/* 左サイド: タイトル・説明 */}
        <div className="flex flex-col items-center lg:items-start" style={{ width: '100%', maxWidth: '320px', gap: '2rem' }}>
          <div className="flex flex-col items-center lg:items-start" style={{ gap: '1rem' }}>
            <div className="font-black uppercase tracking-widest" style={{ fontSize: '10px', color: 'var(--neon-rose)', background: 'rgba(251, 113, 133, 0.1)', padding: '0.25rem 0.75rem', borderRadius: '1rem', border: '1px solid rgba(251, 113, 133, 0.2)' }}>
              Industry Simulator v2.0
            </div>
            <h1 className="font-display font-black" style={{ fontSize: '3.5rem', lineHeight: '1', margin: '0' }}>
              絶望の<br/>
              <span className="neon-text-rose" style={{ fontStyle: 'italic' }}>中抜き</span><br/>
              パチンコ
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: '1.6', margin: '0' }}>
              ~ 月{INITIAL_MONEY.toLocaleString()}円の案件単価が、<br/>
              あなたの銀行口座に届くまでの絶望的な旅路 ~
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: '0.05' }}>
              <Sparkles size={80} />
            </div>
            <h3 className="neon-text-cyan font-black" style={{ fontSize: '0.875rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase' }}>
              <Sparkles size={16} />
              The Reality of SES
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', lineHeight: '1.6', margin: '0' }}>
              日本のIT業界を蝕む多重下請けの商流を、Matter.jsによる物理演算で忠実に再現。元請けからあなたの口座に届くまでに、無数の業者がピンハネしていく現実を体感せよ。
            </p>
          </div>

          <div className="font-black uppercase tracking-widest" style={{ fontSize: '10px', color: '#475569', display: 'none' }}>
            Designed for Viral despair
          </div>
        </div>

        {/* 中央: パチンコ台本体 */}
        <div className="flex flex-col items-center" style={{ gap: '1.5rem' }}>
          {/* マネーカウンター */}
          <div className="glass-panel" style={{ width: '100%', minWidth: '320px', padding: '2rem', textAlign: 'center', position: 'relative' }}>
            <div style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '0.5rem' }}>Estimated Net Income</div>
            <div className="font-display font-black tabular-nums transition-all" style={{ fontSize: '4rem', color: money < 300000 ? 'var(--neon-rose)' : 'var(--neon-amber)', textShadow: money < 300000 ? '0 0 15px rgba(251, 113, 133, 0.5)' : '0 0 15px rgba(251, 191, 36, 0.5)' }}>
              {money.toLocaleString()} <span style={{ fontSize: '1.5rem', opacity: '0.7', marginLeft: '0.25rem' }}>円</span>
            </div>
            {gameState === "playing" && (
              <div style={{ position: 'absolute', bottom: '0', left: '0', width: '100%', height: '4px', background: 'var(--neon-rose)', boxShadow: '0 0 15px var(--neon-rose)', opacity: '0.3' }} className="animate-pulse" />
            )}
          </div>

          <GameCanvas 
            gameState={gameState} 
            money={money}
            onCollision={handleCollision} 
            onTaxZone={handleTaxZone} 
            onFinish={handleFinish} 
            dropX={dropX}
            effects={effects}
            onResetReady={(engine) => {
              engineInstanceRef.current = engine;
              generatePinsInternal(engine);
            }}
          />
        </div>

        {/* 右サイド: コントロール */}
        <div className="flex flex-col" style={{ width: '100%', maxWidth: '320px', gap: '1.5rem' }}>
          {gameState === "idle" ? (
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <label style={{ fontSize: '12px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Drop Position</label>
                  <span style={{ color: 'var(--neon-amber)', fontWeight: '900', fontSize: '14px' }}>{dropX}%</span>
                </div>
                <input 
                  type="range" 
                  min="5" max="95" 
                  value={dropX} 
                  onChange={(e) => setDropX(Number(e.target.value))} 
                  style={{ width: '100%', accentColor: 'var(--neon-rose)', cursor: 'pointer' }}
                />
                <div style={{ fontSize: '10px', color: 'rgba(251, 113, 133, 0.8)', fontWeight: '700', background: 'rgba(251, 113, 133, 0.05)', padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid rgba(251, 113, 133, 0.1)' }}>
                  警告: 構造的に搾取は避けられません。
                </div>
              </div>
              
              <button 
                onClick={handleDrop} 
                style={{ 
                  width: '100%', 
                  background: 'var(--neon-rose)', 
                  color: 'white', 
                  padding: '1.5rem', 
                  borderRadius: '1rem', 
                  fontSize: '1.5rem', 
                  fontWeight: '900', 
                  border: 'none', 
                  cursor: 'pointer',
                  boxShadow: '0 10px 30px rgba(251, 113, 133, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  transition: 'transform 0.2s active'
                }}
              >
                <ArrowDownToLine size={28} />
                案件を受注する
              </button>
            </div>
          ) : (
            <div className="glass-panel" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.1)', opacity: '0.6' }}>
              <div style={{ width: '3rem', height: '3rem', borderRadius: '50%', border: '4px solid rgba(34, 211, 238, 0.2)', borderTopColor: 'var(--neon-cyan)', animation: 'spin 1s linear infinite' }} />
              <style dangerouslySetInnerHTML={{ __html: "@keyframes spin { to { transform: rotate(360deg); } }" }} />
              <div style={{ fontSize: '10px', fontWeight: '900', color: 'var(--neon-cyan)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Simulation In Progress</div>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>業者がピンハネ中...</div>
            </div>
          )}
        </div>
      </div>

      {/* 最終結果モーダル */}
      {gameState === "finished" && (
        <div style={{ position: 'fixed', inset: '0', zIndex: '200', background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '2.5rem', textAlign: 'center' }}>
            <div>
              <div style={{ display: 'inline-block', padding: '0.25rem 1rem', background: 'var(--neon-rose)', color: 'white', borderRadius: '2rem', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '1rem' }}>Simulation Finished</div>
              <h2 className="font-display font-black" style={{ fontSize: '4rem', color: 'white', textTransform: 'uppercase', margin: '0' }}>
                The <span className="neon-text-rose">End</span>
              </h2>
              <p style={{ color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12px' }}>{(INITIAL_MONEY/10000).toLocaleString()}万円の案件の成れの果て</p>
            </div>

            <div className="glass-panel" style={{ padding: '2.5rem', border: '2px solid rgba(255,255,255,0.1)' }}>
              <div style={{ marginBottom: '2rem' }}>
                <p style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: '0.5rem' }}>Your Final Income</p>
                <p className="font-display font-black neon-text-amber" style={{ fontSize: '4.5rem', margin: '0' }}>
                  {money.toLocaleString()}<span style={{ fontSize: '2rem', opacity: '0.7', marginLeft: '0.25rem' }}>円</span>
                </p>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.25rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="neon-text-rose" style={{ fontWeight: '900', fontSize: '1.125rem', fontStyle: 'italic', whiteSpace: 'pre-wrap', margin: '0' }}>
                  {evaluationComment}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <ShareButton deductionRate={deductionRate} finalAmount={money} evaluationMessage={evaluationComment} />
              <button 
                onClick={resetGame} 
                style={{ 
                  width: '100%', background: 'transparent', border: '1px solid #334155', color: '#94a3b8', padding: '1rem', borderRadius: '1rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                }}
              >
                <RefreshCw size={20} />
                もう一度現実を見る
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
