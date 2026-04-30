import React from 'react';
import { Book, Package, Mail, Heart } from 'lucide-react';
import { VideoBackground } from '../components/VideoBackground';

const GithubIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.341-3.369-1.341-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

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
              <GithubIcon className="w-[clamp(24px,1.5vw,32px)] h-[clamp(24px,1.5vw,32px)]" />
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
