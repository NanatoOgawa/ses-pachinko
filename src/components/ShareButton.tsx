"use client";

import { Twitter } from "lucide-react";

interface ShareButtonProps {
  deductionRate: string;
  finalAmount: number;
  evaluationMessage: string;
}

export default function ShareButton({ deductionRate, finalAmount, evaluationMessage }: ShareButtonProps) {
  const handleShare = () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    
    // ユーザー指定の最強フック文にアプリURLをリプ欄に繋げる想定でのテキスト構成
    const text = `日本のIT業界の闇、「多重下請け（SES）の中抜き」を体感できる絶望のピンボール作りました😇

上から落とした月150万の案件が、下に着く頃には【手取り${finalAmount.toLocaleString()}円（中抜き率${deductionRate}%）】になりました。

${evaluationMessage}

業界の縮図を見たい人はどうぞ👇
#SES #個人開発 #エンジニアあるある`;

    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(xUrl, "_blank");
  };

  return (
    <button
      onClick={handleShare}
      className="flex w-full items-center justify-center gap-2 bg-zinc-900 border-2 border-zinc-700 text-white px-8 py-4 rounded-xl font-bold hover:bg-black hover:border-zinc-500 hover:scale-105 transition-all shadow-xl shadow-black/50"
    >
      <Twitter size={24} className="text-blue-400" fill="currentColor" />
      <span className="text-xl">結果をXで嘆く</span>
    </button>
  );
}
