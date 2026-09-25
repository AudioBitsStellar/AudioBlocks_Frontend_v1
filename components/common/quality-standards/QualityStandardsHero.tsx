import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const QualityStandardsHero = () => {
  return (
    <div className="relative w-full min-h-[500px] md:min-h-screen flex items-center justify-center text-white">
      <div className="absolute right-50 top-2 bg-[#490D3E80] rounded-full w-100 h-100 blur-[100px]" />
      <div className="relative z-10 max-w-2xl m-auto text-center px-4">
        <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
          Every Track Is Graded Against Clear Quality Standards
        </h2>
        <p className="text-base md:text-lg text-zinc-200 mb-8">
          AudioBlocks runs an AI quality filter (powered by Mastra AI and NVIDIA) on every upload.
          Your music is measured on clarity, dynamic range, noise floor and distortion, and a
          remaster is always compared against your original upload before anything changes.
        </p>

        {/* CTA Button */}
        <div className="flex items-center justify-center mt-7 md:mt-12">
          <Link
            className="bg-[#D2045B] flex items-center justify-between text-white font-medium px-6 py-3 rounded-full text-sm hover:bg-[#b8034b] transition"
            href="/artist-hub"
          >
            Upload Your Track
            <div className="bg-black rounded-full p-1 ml-2">
              <ArrowRight className="h-4 w-4 rotate-[300deg] text-white" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default QualityStandardsHero;
