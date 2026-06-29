'use client';

import { ArrowUpRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const categories = [
  { name: 'Pop', image: '/dashboard/category1.jpg' },
  { name: 'Contemporary', image: '/dashboard/category2.jpg' },
  { name: 'Rock', image: '/dashboard/category3.jpg' },
  { name: 'Afro', image: '/dashboard/category4.jpg' },
  { name: 'Jazz', image: '/dashboard/category5.jpg' },
];

const CategorySection = () => {
  return (
    <section className="py-6">
     
      <div className="flex justify-between items-center pb-6 border-b">
        <h1 className="text-2xl font-semibold text-[#A3A3A3] font-poppins leading-tight tracking-tight">
          Category
        </h1>
        <Link
          href="#"
          className="bg-[#1E181D] hover:bg-[#885FA8] text-[#A3A3A3] hover:text-[#1E181D] rounded-full p-3"
        >
          <ArrowUpRight className="w-5 h-5" />
        </Link>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-5 overflow-x-auto gap-4 mt-5 scrollbar-hide">
        {categories.map((category, index) => (
          <div
            key={index}
            className="relative md:min-w-[170px] h-[60px] rounded-xl overflow-hidden shrink-0 group"
          >
            <Image
              src={category.image}
              alt={category.name}
              fill
              className="object-cover transition group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <p className="text-white font-medium text-sm">{category.name}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default CategorySection;
