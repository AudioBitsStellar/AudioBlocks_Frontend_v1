'use client';

import { memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useGetExploreCategories } from '@/hooks/useExplore';

const fallbackCategories = [
  { name: 'Pop', image: '/dashboard/category1.jpg' },
  { name: 'Contemporary', image: '/dashboard/category2.jpg' },
  { name: 'Rock', image: '/dashboard/category3.jpg' },
  { name: 'Afro', image: '/dashboard/category4.jpg' },
  { name: 'Jazz', image: '/dashboard/category5.jpg' },
];

const CategorySection = memo(function CategorySection() {
  const { data: categories, isLoading, isError } = useGetExploreCategories();
  const items = isError || !categories || categories.length === 0 ? fallbackCategories : categories;

  return (
    <section className="py-6">
      <div className="flex justify-between items-center pb-6 border-b">
        <h2 className="text-2xl font-semibold text-[#A3A3A3] font-poppins leading-tight tracking-tight">
          Category
        </h2>
        <Link
          aria-label="View all categories"
          className="bg-[#1E181D] hover:bg-[#885FA8] text-[#A3A3A3] hover:text-[#1E181D] rounded-full p-3"
          href="#"
        >
          <ArrowUpRight className="w-5 h-5" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mt-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="md:min-w-[170px] h-[60px] rounded-xl animate-pulse bg-gray-800"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-5 overflow-x-auto gap-4 mt-5 scrollbar-hide">
          {items.map((category, index) => (
            <div
              key={`${category.name}-${index}`}
              className="relative md:min-w-[170px] h-[60px] rounded-xl overflow-hidden shrink-0 group"
            >
              <Image
                fill
                alt={category.name}
                className="object-cover transition group-hover:scale-105"
                src={category.image}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    fallbackCategories[index]?.image ?? '/audio.jpg';
                }}
              />
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <p className="text-white font-medium text-sm">{category.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
});

export default CategorySection;
