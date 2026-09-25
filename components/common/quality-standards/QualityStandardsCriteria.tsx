import type { ReactNode } from 'react';
import { AudioLines, Gauge, Waves, Zap } from 'lucide-react';

interface QualityCriterion {
  title: string;
  description: string;
  icon: ReactNode;
}

const CRITERIA: QualityCriterion[] = [
  {
    title: 'Clarity',
    description: 'How present and intelligible the mix is — muddy or muffled uploads lose points.',
    icon: <AudioLines className="h-8 w-8 text-[#D2045B]" />,
  },
  {
    title: 'Dynamic range',
    description: 'Whether quiet and loud passages keep their contrast instead of being crushed.',
    icon: <Gauge className="h-8 w-8 text-[#D2045B]" />,
  },
  {
    title: 'Noise floor',
    description: 'Background hiss and hum. A cleaner recording scores a higher noise-floor grade.',
    icon: <Waves className="h-8 w-8 text-[#D2045B]" />,
  },
  {
    title: 'Distortion',
    description: 'Clipping and digital artefacts. Clean uploads are rewarded over over-compressed ones.',
    icon: <Zap className="h-8 w-8 text-[#D2045B]" />,
  },
];

const QualityStandardsCriteria = () => {
  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="font-['Poppins'] mx-auto w-[60%] font-semibold text-[40px] leading-[100%] tracking-[0%] text-center capitalize text-white">
            What We Check On Every Upload
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {CRITERIA.map((criterion) => (
            <div
              key={criterion.title}
              className="bg-[#171016] p-8 border-[1px] rounded-[23.54px] border-[#333333]"
            >
              <div className="mb-6">{criterion.icon}</div>
              <h3 className="font-['Poppins'] font-bold text-2xl text-white leading-tight">
                {criterion.title}
              </h3>
              <p className="font-['Inter'] font-medium text-[16px] leading-[150%] text-[#A3A3A3] mt-4">
                {criterion.description}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-[#171016] p-8 border-[1px] rounded-[23.54px] border-[#333333] mt-8">
          <h3 className="font-['Poppins'] font-bold text-2xl text-white leading-tight">
            Remasters Are Never Assessed Alone
          </h3>
          <p className="font-['Inter'] font-medium text-[16px] leading-[150%] text-[#A3A3A3] mt-4">
            When you upload a remaster, AudioBlocks compares it against the analysis of your
            original upload. The comparison shows which metrics moved and by how many points, and
            flags the change as an improvement or a regression — your original upload always stays
            available.
          </p>
        </div>
      </div>
    </section>
  );
};

export default QualityStandardsCriteria;
