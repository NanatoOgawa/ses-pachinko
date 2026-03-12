"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Matter from "matter-js";
import { Sparkles, ArrowDownToLine, RefreshCw } from "lucide-react";
import ShareButton from "../components/ShareButton";

// エンジンのエイリアス
const { Engine, Render, Runner, World, Bodies, Body, Events, Composite } = Matter;

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
          Body.scale(ball, 0.8, 0.8);
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
          Body.applyForce(b, b.position, { x: (Math.random() - 0.5) * 0.005, y: 0.002 });
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
      const ball = Bodies.circle(dropXPos, 30, 20, {
        label: "ball",
        restitution: 0.8,
        friction: 0,
        frictionAir: 0.02,
        density: 0.04,
        render: { fillStyle: "#fbbf24", strokeStyle: "#f59e0b", lineWidth: 3 },
      });
      ballRef.current = ball;
      World.add(engineRef.current.world, ball);
    } else if (gameState === "idle" && ballRef.current) {
      if (engineRef.current) Composite.remove(engineRef.current.world, ballRef.current);
      ballRef.current = null;
    }
  }, [gameState]);

  return (
    <div className="relative w-[390px] h-[700px] border-2 border-zinc-800 rounded-3xl overflow-hidden bg-black/50 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
      <div ref={sceneRef} className="absolute inset-0" />
      {gameState === "idle" && (
        <div 
          className="absolute top-4 w-12 h-12 border-4 border-yellow-500/50 rounded-full flex items-center justify-center animate-pulse"
          style={{ left: `${dropX}%`, transform: 'translateX(-50%)' }}
        >
          <span className="text-yellow-500 text-xs font-bold">{(INITIAL_MONEY/10000)}万</span>
        </div>
      )}
      <div className="absolute bottom-[60px] left-0 w-full text-center pointer-events-none">
        <span className="bg-red-900/80 text-white text-xs px-4 py-1 rounded-full font-bold border border-red-500/50">
          絶対防衛線：税金・社会保険料 (-20%)
        </span>
      </div>
      <div className="absolute bottom-2 left-0 w-full text-center pointer-events-none">
        <span className="text-zinc-500 text-sm font-black tracking-widest">ENGINEER (YOUR BANK ACCOUNT)</span>
      </div>
      {effects.map((ef) => (
        <div
          key={ef.id}
          className="absolute text-rose-500 font-extrabold text-xl pointer-events-none animate-float-up text-shadow-glow"
          style={{ left: ef.x - 20, top: ef.y - 10 }}
        >
          {ef.text}
        </div>
      ))}
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
    <main className="min-h-screen flex flex-col items-center pb-20 bg-scanlines text-zinc-100 font-sans tracking-tight">
      <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8 lg:mt-10 px-4">
        
        {/* 左サイドパネル */}
        <div className="hidden lg:flex flex-col w-1/3 xl:w-1/4 space-y-6 pt-10">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-rose-500 text-shadow-glow leading-tight">絶望の<br/>中抜きパチンコ</h1>
          </div>
          <div className="glass-dark p-6 rounded-2xl border border-zinc-700/50">
            <h3 className="text-rose-400 font-bold mb-2 flex items-center gap-2"><Sparkles size={18} />SESの「商流」を体感</h3>
            <p className="text-zinc-500 text-xs leading-relaxed">日本のIT業界を蝕む多重下請け。元請けからあなたの口座に届くまでに、無数の業者がピンハネしていく現実をリアルな物理シミュレーションで再現。</p>
          </div>
        </div>

        {/* 中央: ゲームエリア */}
        <div className="flex flex-col items-center space-y-4">
          <div className="lg:hidden w-full max-w-md p-6 text-center space-y-2 mt-4">
            <h1 className="text-3xl font-black text-rose-500 text-shadow-glow">絶望の中抜きパチンコ</h1>
          </div>

          {/* スコアボード - レイアウトシフト防止のため幅固定 */}
          <div className="w-full max-w-md z-10 sticky top-4 mb-4 h-[120px]">
            <div className="glass-dark rounded-2xl p-4 flex flex-col items-center justify-center relative overflow-hidden border border-rose-500/20 shadow-[0_0_30px_rgba(225,29,72,0.1)] h-full">
              <p className="text-zinc-400 text-sm font-bold mb-1">現在の案件価値（見込み）</p>
              <div className="text-5xl font-black tabular-nums min-w-[300px] text-center" style={{ color: money < 300000 ? '#ef4444' : '#fbbf24' }}>
                {money.toLocaleString()} <span className="text-2xl">円</span>
              </div>
            </div>
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

        {/* 右サイドパネル */}
        <div className="w-full lg:w-1/3 xl:w-1/4 max-w-md lg:pt-32 space-y-4 px-2">
          {gameState === "idle" && (
            <div className="glass-dark p-6 rounded-2xl space-y-6 shadow-2xl border border-zinc-700/50">
              <div className="space-y-3">
                <label className="block text-center text-sm font-bold text-zinc-300">
                  ボール（案件）を落とす位置を決めろ。<br/>
                  <span className="text-rose-400 text-xs mt-1 block tracking-wider">※どこから落としても構造的に搾取されます</span>
                </label>
                <div className="px-2">
                  <input type="range" min="5" max="95" value={dropX} onChange={(e) => setDropX(Number(e.target.value))} className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-rose-500" />
                </div>
              </div>
              <button onClick={handleDrop} className="w-full bg-rose-600 hover:bg-rose-500 text-white py-5 rounded-xl text-xl font-black shadow-[0_10px_20px_rgba(225,29,72,0.3)] transition-all active:scale-95 flex items-center justify-center gap-3 group">
                <ArrowDownToLine size={24} className="group-hover:translate-y-1 transition-transform" />案件を受注する
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 結果表示 */}
      {gameState === "finished" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="bg-zinc-900 border-2 border-zinc-700 p-8 rounded-3xl max-w-md w-full shadow-2xl space-y-8 animate-in zoom-in-95 duration-500">
            <div className="text-center space-y-2">
              <h2 className="text-4xl font-black text-rose-500 text-shadow-glow">FINISH...</h2>
              <p className="text-zinc-400 font-bold">{INITIAL_MONEY.toLocaleString()}円の案件の末路</p>
            </div>
            <div className="space-y-4 bg-black/50 p-6 rounded-2xl border border-zinc-800 text-center">
              <p className="text-sm font-bold text-zinc-500 mb-1">最終的なあなたの手取り額</p>
              <p className="text-5xl font-black text-amber-400">{money.toLocaleString()}<span className="text-2xl">円</span></p>
              <p className="text-rose-400 font-bold text-sm italic mt-4 whitespace-pre-wrap">{evaluationComment}</p>
            </div>
            <div className="space-y-4">
              <ShareButton deductionRate={deductionRate} finalAmount={money} evaluationMessage={evaluationComment} />
              <button onClick={resetGame} className="w-full flex items-center justify-center gap-2 text-zinc-400 hover:text-white py-3 rounded-xl font-bold transition-colors bg-zinc-800 border-zinc-700">
                <RefreshCw size={20} />もう一度現実を見る
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
