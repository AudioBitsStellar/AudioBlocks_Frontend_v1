import Image from 'next/image';
const collectives = [
  {
    image: '/home/Container5.svg',
    title: 'Global Distribution',
    description: 'We handle the upload and your music goes live on major platforms.',
    border: 'border-[#D2045B33]',
  },
  {
    image: '/home/Container4.svg',
    title: 'Strategic Collaborations and Growth',
    description:
      'Connect with top producers, artists and monitor your impact with real-time dashboards.',
    border: 'border-[#1D1D20]',
  },
  {
    image: '/home/Container3.svg',
    title: 'Transparent Royalties',
    description: 'Smart contracts manage rewards based on verified performance',
    border: 'border-[#1D1D20]',
  },
];
const Collective = () => {
  return (
    <>
      <div className="max-w-lg px-4 md:px-0 text-center mx-auto mt-10">
        <h1 className="font-semibold text-[#A3A3A3] text-2xl mb-2 md:text-4xl leading-[100%] tracking-[0%] capitalize font-poppins">
          Why <span className="text-white">Join</span> the Collective
        </h1>
        <p className="text-[#A3A3A3] text-sm font-medium">
          Explore the tools that make AudioBlocks the go-to platform for artists and music lovers
          alike
        </p>
      </div>
      <div className="w-4/5 relative  m-auto grid md:grid-cols-3 grid-cols-1 py-7 md:py-15  gap-5">
        <div className="absolute md:right-70 -z-10 -left-10 md:left-70 top-2 bg-[#490D3E80] rounded-full w-70 md:w-100 h-100 blur-[150px]" />
        {collectives.map((collective, id) => (
          <div key={id} className={`rounded-2xl border ${collective.border}`}>
            <div className=" h-3/5 rounded-t-2xl w-full">
              <Image
                alt="image"
                className="object-cover w-full h-full rounded-t-2xl"
                height={900}
                loading="lazy"
                src={collective.image}
                width={900}
              />
            </div>
            <div className="px-6 py-8">
              <h2 className="font-semibold text-base mb-2">{collective.title}</h2>
              <p className="font-normal text-sm text-[#A3A3A3]">{collective.description}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

export default Collective;
