import React from 'react';
import { Github, Book, Package, Mail, Heart } from 'lucide-react';
import { VideoBackground } from '../components/VideoBackground';

export const OutroSlide: React.FC = () => {
  return (
    <>
      <VideoBackground src="https://stream.mux.com/00qQnfNo7sSpn3pB1hYKkyeSDvxs01NxiQ3sr29uL3e028.m3u8" />
      
      <div className="absolute inset-0 flex flex-col pt-[4%] pb-[3%] z-10">
        {/* Header */}
        <div className="flex justify-between items-center w-full px-[5.2%]">
          <svg className="h-10 w-32" viewBox="0 0 129 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <text x="0" y="28" fill="white" className="font-bold text-2xl tracking-tighter">TableCraft</text>
          </svg>
          <span className="text-[clamp(12px,1.05vw,20px)] opacity-80 uppercase tracking-widest font-medium">Product Overview</span>
          <span className="text-[clamp(12px,1.05vw,20px)] opacity-80">Page 020</span>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center translate-y-[-5%] px-[5.2%]">
          <h2 className="text-[clamp(28px,3.5vw,64px)] tracking-[-0.02em] leading-[1.05] font-bold">
            Get Started / Today
          </h2>
          
          <p className="text-[clamp(13px,1.1vw,20px)] opacity-90 max-w-[38%] mt-[3%] leading-relaxed font-medium">
            Install TableCraft in your existing Drizzle and Shadcn project. Stop writing repetitive boilerplate and start building complex, fully-featured data tables in minutes.
          </p>

          <div className="flex flex-col gap-[clamp(12px,1vw,19px)] mt-[3%]">
            <a href="https://github.com/jacksonkasi1/tablecraft" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 hover:opacity-80 transition-opacity w-fit">
              <Github className="w-[clamp(24px,1.5vw,32px)] h-[clamp(24px,1.5vw,32px)]" />
              <span className="text-[clamp(13px,1.1vw,20px)] font-bold">github.com/jacksonkasi1/tablecraft</span>
            </a>
            
            <a href="https://jacksonkasi.gitbook.io/tablecraft" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 hover:opacity-80 transition-opacity w-fit">
              <Book className="w-[clamp(24px,1.5vw,32px)] h-[clamp(24px,1.5vw,32px)]" />
              <span className="text-[clamp(13px,1.1vw,20px)] font-bold">jacksonkasi.gitbook.io/tablecraft</span>
            </a>
            
            <div className="flex items-center gap-4 w-fit mt-1">
              <Package className="w-[clamp(24px,1.5vw,32px)] h-[clamp(24px,1.5vw,32px)]" />
              <code className="text-[clamp(13px,1.1vw,20px)] font-bold bg-white/10 px-3 py-1.5 rounded-md border border-white/20">npm install @tablecraft/engine</code>
            </div>
            
            <div className="flex items-center gap-4 w-fit mt-1">
              <Mail className="w-[clamp(24px,1.5vw,32px)] h-[clamp(24px,1.5vw,32px)]" />
              <span className="text-[clamp(13px,1.1vw,20px)] font-bold">Open Source Community</span>
            </div>
            
            <div className="flex items-center gap-4 w-fit mt-1">
              <Heart className="w-[clamp(24px,1.5vw,32px)] h-[clamp(24px,1.5vw,32px)] text-pink-500" />
              <span className="text-[clamp(13px,1.1vw,20px)] font-bold">MIT Licensed</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};