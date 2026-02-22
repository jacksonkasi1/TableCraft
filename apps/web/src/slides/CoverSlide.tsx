import React from 'react';
import { VideoBackground } from '../components/VideoBackground';

export const CoverSlide: React.FC = () => {
  return (
    <>
      <VideoBackground src="https://stream.mux.com/JNJEOYI6B3EffB9f5ZhpGbuxzc6gSyJcXaCBbCgZKRg.m3u8" />
      
      <div className="absolute inset-0 flex flex-col px-[5.2%] pt-[4%] pb-[3%]">
        {/* Header */}
        <div className="flex justify-between items-center w-full relative z-10">
          <svg className="h-10 w-32" viewBox="0 0 129 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <text x="0" y="28" fill="white" className="font-bold text-2xl tracking-tighter">TableCraft</text>
          </svg>
          <span className="text-[clamp(12px,1.05vw,20px)] opacity-80 uppercase tracking-widest font-medium">Product Overview</span>
        </div>

        {/* Center content */}
        <div className="flex-1 flex flex-col justify-center translate-y-[-3%] relative z-10">
          <h1 className="text-[clamp(32px,4vw,96px)] tracking-[-0.02em] leading-[1.05] font-bold">
            Complex Tables in 5 Minutes
          </h1>
          <p className="text-[clamp(20px,2.5vw,48px)] opacity-90 mt-[1.5%] font-medium">
            Drizzle + Shadcn + Zero Config
          </p>
          <p className="text-[clamp(14px,1.5vw,24px)] opacity-75 mt-[2%] font-medium uppercase tracking-wider">
            Open Source
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-center w-full relative z-10">
          <span className="text-[clamp(12px,1.05vw,20px)] opacity-60">{new Date().getFullYear()}</span>
        </div>
      </div>
    </>
  );
};