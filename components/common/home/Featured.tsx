import Image from 'next/image';

const features = [
  {
    image: '/home/Container2.png',
    title: 'Stream and Earn',
    description: 'Turn your playlists to earn rewards as you engage',
    border: 'border-[#D2045B33]',
  },
  {
    image: '/home/Container.png',
    title: 'Seamless Listening Platform',
    description:
      'Enjoy uninterrupted, high-quality streaming with zero ads and lightning-fast playback',
    border: 'border-[#1D1D20]',
  },
  {
    image: '/home/Container1.png',
    title: 'NFT Music Marketplace',
    description: 'Collect, support, and trade exclusive tracks directly from your favorite artists',
    border: 'border-[#1D1D20]',
  },
];

const Featured = () => {
  return (
    <>
      <div className="max-w-lg px-4 md:px-0 text-center mx-auto mt-10">
        <h1 className="font-semibold text-[#A3A3A3] text-2xl mb-2 md:text-4xl leading-[100%] tracking-[0%] capitalize font-poppins">
          Key <span className="text-white">Features</span> Overview
        </h1>
        <p className="text-[#A3A3A3] text-sm font-medium">
          Explore the tools that make AudioBlocks the go-to platform for artists and music lovers
          alike
        </p>
      </div>
      <div className="w-4/5 relative  m-auto grid md:grid-cols-3 grid-cols-1 py-7 md:py-15  gap-5">
       <div className='absolute md:right-70 -z-10 -left-10 md:left-70 top-2 bg-[#490D3E80] rounded-full w-70 md:w-100 h-100 blur-[150px]' aria-hidden="true"/>
        {features.map((feature, id) => (
          <article key={id} className={`rounded-2xl border ${feature.border}`}>
            <div className=" h-3/5 rounded-t-2xl w-full">
              <Image
                width={900}
                height={900}
                className="object-cover w-full h-full rounded-t-2xl"
                loading="lazy"
                src={feature.image}
                alt={feature.title}
              />
            </div>
            <div className="px-6 py-8">
              <h2 className='font-semibold text-base mb-2'>{feature.title}</h2>
              <p className='font-normal text-sm text-[#A3A3A3]'>{feature.description}</p>
            </div>
          </article>
        ))}
      </div>
    </>
  );
};

export default Featured;
