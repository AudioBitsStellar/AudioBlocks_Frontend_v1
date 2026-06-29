
"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  House,
  ListMusic,
  BarChart2,
  Users,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"

const navItems = [
  { name: "Explore", href: "/dashboard", icon: House },
  { name: "My Playlist", href: "/dashboard/playlist", icon: ListMusic },
  { name: "Metrics", href: "#", icon: BarChart2 },
  { name: "Community", href: "/dashboard/community", icon: Users },
]

interface SidebarProps {
  openMobile: boolean;
  onOpenMobileChange: (open: boolean) => void;
}

const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const pathname = usePathname()

  return (
    <>
      <Link href="/" className="flex justify-left items-center mb-8">
        <Image src="/logo.png" alt="Logo" width={80} height={80} />
      </Link>

      <nav className="flex flex-col gap-2 mb-10">
        {navItems.map(({ name, href, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={name}
              href={href}
              className={`flex items-center gap-3 py-2 hover:bg-gradient-to-r hover:from-[#D2045B] hover:to-[#885FA8] hover:bg-clip-text hover:text-transparent font-semibold rounded-lg transition-all text-sm ${
                isActive
                  ? "bg-gradient-to-r from-[#D2045B] to-[#885FA8] bg-clip-text text-transparent"
                  : "text-[#A3A3A3] "
              }`}
              onClick={onNavigate}
            >
              <Icon size={18} className="text-white" />
              {name}
            </Link>
          )
        })}
      </nav>

      <div className="absolute flex flex-col bottom-20 left-4 text-xs font-bold text-gray-400 space-y-4">
        <Link className="hover:bg-gradient-to-r hover:from-[#D2045B] hover:to-[#885FA8] hover:bg-clip-text hover:text-transparent" href="#">Legal</Link>
        <Link className="hover:bg-gradient-to-r hover:from-[#D2045B] hover:to-[#885FA8] hover:bg-clip-text hover:text-transparent" href="#">Privacy Policy</Link>
        <Link className="hover:bg-gradient-to-r hover:from-[#D2045B] hover:to-[#885FA8] hover:bg-clip-text hover:text-transparent" href="#">Cookies</Link>
      </div>
    </>
  )
}

const Sidebar = ({ openMobile, onOpenMobileChange }: SidebarProps) => {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={onOpenMobileChange}>
        <SheetContent side="left" className="w-[16rem] p-5 bg-[#161616] border-[#2B2B2B]">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Dashboard navigation menu</SheetDescription>
          <SidebarContent onNavigate={() => onOpenMobileChange(false)} />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <aside className="hidden md:block bg-[#161616] text-white w-45 h-screen px-5 py-6 fixed top-0 left-0 z-40 shadow-md transition-all duration-300">
      <SidebarContent />
    </aside>
  )
}

export default Sidebar
