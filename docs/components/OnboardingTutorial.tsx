import React, { useState } from 'react';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';

interface TutorialStep {
  title: string;
  content: string;
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
}

const steps: TutorialStep[] = [
  {
    title: "歡迎使用 LOOP STATION",
    content: "這是一個模擬 BOSS RC-505 MKII 的網頁版循環錄音工作站。您可以錄製並疊加多層聲音，創造獨特的音樂作品。\n\n接下來為您簡單介紹如何操作！",
    position: 'center'
  },
  {
    title: "音軌控制 (Tracks)",
    content: "這裡有 5 個獨立的音軌。點擊中間的大圓圈即可開始「錄音」🔴，再次點擊變為「播放」🟢，再點擊一次則「停止」錄音。\n\n外圈綠色光環代表目前的循環進度。",
    position: 'center'
  },
  {
    title: "調整音量與特效",
    content: "每個音軌都有獨立的音量推桿 (Fader) 和上方的 FX 旋鈕，讓您可以自由混音。",
    position: 'center'
  },
  {
    title: "全域控制 (Global Control)",
    content: "右上方的按鈕可以一次控制所有音軌：\n🔴 All Start: 全部播放\n⬛ All Stop: 全部停止\n↩️ Clear All: 清除所有錄音",
    position: 'top'
  },
  {
    title: "節拍器與速度 (BPM)",
    content: "上方螢幕顯示目前的 BPM 速度。您可以手動調整數字，或使用「TAP TEMPO」按鈕跟隨節奏點擊來設定速度。\n\n點擊「RHYTHM」區塊可以開啟節拍器聲音。",
    position: 'top'
  },
  {
    title: "開始創作吧！",
    content: "準備好了嗎？試著錄下您的第一個 Beatbox 或旋律吧！",
    position: 'center'
  }
];

export const OnboardingTutorial: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(c => c + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(c => c - 1);
    }
  };

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-all duration-300">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-300">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-red-500 bg-red-900/20 px-2 py-1 rounded border border-red-500/20">
              STEP {currentStep + 1} / {steps.length}
            </span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-4">{step.title}</h2>
            <p className="text-gray-300 leading-relaxed whitespace-pre-line text-sm">
              {step.content}
            </p>
          </div>

          <div className="flex items-center justify-between mt-4">
            <button 
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 text-sm font-bold uppercase transition-colors ${currentStep === 0 ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-white'}`}
            >
              <ArrowLeft size={16} />
              Prev
            </button>

            <button 
              onClick={handleNext}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-full font-bold text-sm transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)] active:scale-95"
            >
              {currentStep === steps.length - 1 ? 'Start' : 'Next'}
              {currentStep < steps.length - 1 && <ArrowRight size={16} />}
            </button>
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mt-8">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`w-2 h-2 rounded-full transition-all duration-300 ${i === currentStep ? 'bg-red-500 scale-125' : 'bg-gray-700'}`} 
            />
          ))}
        </div>
      </div>
    </div>
  );
};



















