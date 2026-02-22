import React from 'react';
import { VideoBackground } from '../components/VideoBackground';

export const IntroSlide: React.FC = () => {
  return (
    <>
      <VideoBackground src="https://stream.mux.com/Kec29dVyJgiPdtWaQtPuEiiGHkJIYQAVUJcNiIHUYeo.m3u8" />
      
      <div className="absolute inset-0 flex flex-col px-[5.2%] pt-[4%] pb-[3%] z-10">
        {/* Header */}
        <div className="flex justify-between items-center w-full">
          <svg className="h-10 w-32" viewBox="0 0 129 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <text x="0" y="28" fill="white" className="font-bold text-2xl tracking-tighter">TableCraft</text>
          </svg>
          <span className="text-[clamp(12px,1.05vw,20px)] opacity-80 uppercase tracking-widest font-medium">Product Overview</span>
          <span className="text-[clamp(12px,1.05vw,20px)] opacity-80">Page 001</span>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center translate-y-[-5%]">
          <h2 className="text-[clamp(28px,3.5vw,64px)] tracking-[-0.02em] leading-[1.05] font-bold">
            The Problem / Building Data Tables
          </h2>
          
          <div className="flex mt-[3.5%] gap-[4%] items-stretch h-[25vh] max-h-[250px]">
            {/* Column 1 */}
            <div className="flex-[0_0_22%] flex flex-col justify-between">
              <p className="text-[clamp(13px,1.1vw,20px)] opacity-80 leading-relaxed font-medium">
                Repetitive table setup with manual columns, complex sorting, custom filtering, and pagination state.
              </p>
              <div className="mt-auto flex items-baseline gap-3">
                <span className="text-[clamp(28px,3.5vw,64px)] font-bold">1hr+</span>
                <span className="text-[clamp(13px,1.05vw,20px)] text-white/80 uppercase tracking-widest font-bold">Wasted</span>
              </div>
            </div>

            {/* Column 2 */}
            <div className="flex-[0_0_38%] border-l border-white/10 pl-[4%]">
              <p className="text-[clamp(13px,1.1vw,20px)] opacity-90 leading-[1.5] font-medium">
                Developers spend countless hours writing the exact same boilerplate code for every single table in an application. You have to manually map database schema to table columns, write complex search logic, handle dozens of custom filter handlers, synchronize pagination state with the server, and implement basic export functionality over and over again. It's tedious, error-prone, and a massive drain on engineering velocity.
              </p>
            </div>

            {/* Column 3 */}
            <div className="flex-[0_0_20%] flex flex-col justify-between border-l border-white/10 pl-[4%]">
              <div>
                <span className="text-[clamp(28px,3.5vw,64px)] font-bold block leading-none">5min</span>
                <span className="text-[clamp(13px,1.1vw,20px)] text-white/80 block mt-2 font-medium">with TableCraft</span>
              </div>
              <div className="mt-auto h-16 relative w-full flex items-end">
                <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible absolute inset-0" preserveAspectRatio="none">
                  <path d="M 0 45 C 30 45, 50 10, 100 5" fill="url(#grad)" />
                  <path d="M 0 45 C 30 45, 50 10, 100 5" fill="none" stroke="white" strokeWidth="2" />
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D2FF55" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#D2FF55" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute w-[9px] h-[9px] rounded-full bg-[#B750B2] border-[1.5px] border-white top-[90%] left-0 -translate-x-1/2 -translate-y-1/2 z-10" />
                <div className="absolute w-[9px] h-[9px] rounded-full bg-[#B750B2] border-[1.5px] border-white top-[10%] left-[100%] -translate-x-1/2 -translate-y-1/2 z-10" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end w-full">
          <span className="text-[clamp(12px,1.05vw,20px)] opacity-60 font-medium">The Table Problem</span>
        </div>
      </div>
    </>
  );
};