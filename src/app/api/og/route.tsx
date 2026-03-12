import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // デフォルト値
    const initialRaw = searchParams.get("initial") || "1500000";
    const finalRaw = searchParams.get("final") || "185000";
    
    const initial = parseInt(initialRaw, 10);
    const final = parseInt(finalRaw, 10);
    const deducted = initial - final;
    const deductionRate = ((deducted / initial) * 100).toFixed(1);

    // ランク判定（日本SEの平均月収・手取り20-30万に基づき調整）
    let rank = "S（奇跡の生存者）";
    let message = "「フリーランスになった方がいいのでは？🤔」";
    let colorFinal = "#fbbf24"; // amber/yellow

    if (final < 200000) {
      rank = "C（業界の養分）";
      message = "「君の代わりはいくらでもいるから😊」";
      colorFinal = "#ef4444"; // red
    } else if (final < 250000) {
      rank = "B（従順なソルジャー）";
      message = "「経験積めるから実質プラスだよね？😉」";
      colorFinal = "#f97316"; // orange
    } else if (final < 300000) {
      rank = "A（標準的なエンジニア）";
      message = "「今回は頑張って単価交渉しといたよ！🫡」";
      colorFinal = "#3b82f6"; // blue
    }


    const formatter = new Intl.NumberFormat("ja-JP");

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#09090b", // zinc-950
            fontFamily: "sans-serif",
            padding: "40px",
            color: "#fff",
          }}
        >
          {/* 背景の警告テキストや枠など */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              border: "8px solid #3f3f46",
              margin: "20px",
              opacity: 0.8,
            }}
          />

          <h1
            style={{
              fontSize: 64,
              fontWeight: 900,
              color: "#fca5a5",
              marginBottom: 40,
              display: "flex",
              textAlign: "center",
              textShadow: "0px 4px 10px rgba(248, 113, 113, 0.5)",
            }}
          >
            【あなたのSES奴隷ランク：{rank}】
          </h1>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: "#18181b",
              padding: "40px",
              width: "80%",
              borderRadius: "20px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5)",
              border: "2px solid #27272a",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 40, marginBottom: 20 }}>
              <span style={{ color: "#a1a1aa" }}>案件単価（見込み）</span>
              <span style={{ fontWeight: 700, color: "#fff" }}>{formatter.format(initial)} 円</span>
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 40, marginBottom: 40, color: "#f87171" }}>
              <span>各社の中抜き額</span>
              <span style={{ fontWeight: 700 }}>- {formatter.format(deducted)} 円 ({deductionRate}%)</span>
            </div>

            <div style={{ width: "100%", height: "2px", background: "#3f3f46", marginBottom: 40 }} />

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 60, fontWeight: 900 }}>
              <span>最終手取り額</span>
              <span style={{ color: colorFinal, textShadow: `0 0 20px ${colorFinal}` }}>
                {formatter.format(final)} 円
              </span>
            </div>
          </div>

          <div
            style={{
              marginTop: 40,
              fontSize: 36,
              color: "#a1a1aa",
              fontStyle: "italic",
              display: "flex",
            }}
          >
            {message}
          </div>
          
          <div
            style={{
              position: "absolute",
              bottom: 40,
              fontSize: 24,
              color: "#52525b",
              fontWeight: "bold",
              display: "flex",
            }}
          >
            絶望のパチンコ『多重下請け（SES）』中抜きシミュレーター
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: unknown) {
    console.error(e);
    return new Response(`Failed to generate image`, { status: 500 });
  }
}
