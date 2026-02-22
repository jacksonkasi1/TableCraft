import React from 'react';
import { VideoBackground } from '../components/VideoBackground';

export const QuoteSlide: React.FC = () => {
  return (
    <>
      <VideoBackground src="https://stream.mux.com/4IMYGcL01xjs7ek5ANO17JC4VQVUTsojZlnw4fXzwSxc.m3u8" />
      
      <div className="absolute inset-0 flex flex-col justify-center items-center px-[5.2%] z-10 text-center">
        <div className="max-w-[70%] flex flex-col gap-[12px]">
          <span className="text-[clamp(14px,1.2vw,20px)] opacity-90 font-bold uppercase tracking-widest text-left ml-2 text-[#D2FF55]">Developer Experience</span>
          <blockquote className="text-[clamp(28px,4vw,64px)] tracking-[-0.02em] leading-[1.15] font-bold text-left">
            “Stop building tables. Start building products.”
          </blockquote>
        </div>
      </div>
    </>
  );
};