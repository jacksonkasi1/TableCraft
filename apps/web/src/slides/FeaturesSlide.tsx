import React from 'react';
import { Columns, Search, Filter, ArrowUpDown, Shield } from 'lucide-react';
import { VideoBackground } from '../components/VideoBackground';
import { LiquidCard } from '../components/LiquidCard';

export const FeaturesSlide: React.FC = () => {
  return (
    <>
      <VideoBackground src="https://stream.mux.com/fHfa8VIbBdqZelLGg5thjsypZ101M01dbyIMLNDWQwlLA.m3u8" />
      
      <div className="absolute inset-0 flex flex-col pt-[4%] pb-[3%] z-10">
        {/* Header */}
        <div className="flex justify-between items-center w-full px-[5.2%]">
          <svg className="h-10 w-32" viewBox="0 0 129 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <text x="0" y="28" fill="white" className="font-bold text-2xl tracking-tighter">TableCraft</text>
          </svg>
          <span className="text-[clamp(12px,1.05vw,20px)] opacity-80 uppercase tracking-widest font-medium">Product Overview</span>
          <span className="text-[clamp(12px,1.05vw,20px)] opacity-80">Page 002</span>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center translate-y-[-2%]">
          <div className="flex flex-col items-center mb-[4%]">
            <span className="text-[clamp(14px,1.2vw,24px)] opacity-90 font-medium">Build Powerful Tables with</span>
            <h2 className="text-[clamp(28px,3.5vw,64px)] font-bold tracking-[-0.02em]">Zero Configuration</h2>
          </div>
          
          <div className="flex flex-col gap-[clamp(10px,1.5vw,27px)] px-[5.2%] h-[45vh] min-h-[400px]">
            {/* Top row */}
            <div className="flex gap-[clamp(10px,1.5vw,27px)] flex-[1.2]">
              <LiquidCard className="flex-1 flex flex-col justify-end p-[clamp(20px,2.5vw,48px)]">
                <Columns className="w-[clamp(32px,2.5vw,48px)] h-[clamp(32px,2.5vw,48px)] mb-auto" />
                <h3 className="text-[clamp(18px,1.5vw,36px)] font-bold mb-2">Auto Columns</h3>
                <p className="text-[clamp(12px,1vw,20px)] text-white/80 font-medium leading-snug">Columns generated from your Drizzle schema automatically. No manual definitions.</p>
              </LiquidCard>
              <LiquidCard className="flex-1 flex flex-col justify-end p-[clamp(20px,2.5vw,48px)]">
                <Search className="w-[clamp(32px,2.5vw,48px)] h-[clamp(32px,2.5vw,48px)] mb-auto" />
                <h3 className="text-[clamp(18px,1.5vw,36px)] font-bold mb-2">Global Search</h3>
                <p className="text-[clamp(12px,1vw,20px)] text-white/80 font-medium leading-snug">Full-text search across all columns with powerful operator support.</p>
              </LiquidCard>
              <LiquidCard className="flex-1 flex flex-col justify-end p-[clamp(20px,2.5vw,48px)]">
                <Filter className="w-[clamp(32px,2.5vw,48px)] h-[clamp(32px,2.5vw,48px)] mb-auto" />
                <h3 className="text-[clamp(18px,1.5vw,36px)] font-bold mb-2">Smart Filters</h3>
                <p className="text-[clamp(12px,1vw,20px)] text-white/80 font-medium leading-snug">Date range picker, exact match, and advanced filter operators built-in.</p>
              </LiquidCard>
            </div>
            
            {/* Bottom row */}
            <div className="flex gap-[clamp(10px,1.5vw,25px)] flex-1">
              <LiquidCard className="flex-1 flex flex-col justify-end p-[clamp(20px,2.5vw,48px)]">
                <ArrowUpDown className="w-[clamp(32px,2.5vw,48px)] h-[clamp(32px,2.5vw,48px)] mb-auto" />
                <h3 className="text-[clamp(18px,1.5vw,36px)] font-bold mb-2">Sort & Paginate</h3>
                <p className="text-[clamp(12px,1vw,20px)] text-white/80 font-medium leading-snug">Multi-column sorting with cursor or offset-based pagination.</p>
              </LiquidCard>
              <LiquidCard className="flex-1 flex flex-col justify-end p-[clamp(20px,2.5vw,48px)]">
                <Shield className="w-[clamp(32px,2.5vw,48px)] h-[clamp(32px,2.5vw,48px)] mb-auto" />
                <h3 className="text-[clamp(18px,1.5vw,36px)] font-bold mb-2">Secure by Default</h3>
                <p className="text-[clamp(12px,1vw,20px)] text-white/80 font-medium leading-snug">Hide sensitive columns, role-based visibility, tenant isolation.</p>
              </LiquidCard>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};