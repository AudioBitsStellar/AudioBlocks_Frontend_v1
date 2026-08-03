import Image from 'next/image';
import Link from 'next/link';
import { Facebook, Twitter, Youtube, Mail } from 'lucide-react';

const Instagram = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="2"
    viewBox="0 0 24 24"
  >
    <rect height="20" rx="5" ry="5" width="20" x="2" y="2" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const Footer = () => {
  return (
    <>
      <footer className="bg-zinc-900 text-[#A7AAB5] py-12">
        <div className="w-11/12 mx-auto items-center grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div>
            <Image alt="" className="mb-4" height={90} src="/logo.png" width={90} />
            <p className="text-sm">
              AudioBlock is a music platform that empowers artists to retain ownership of their
              music and earn fair revenue. Fans can discover, stream, and support artists directly.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-[#5B5C61] font-semibold mb-4">Navigation</h3>
            <ul className="space-y-4 text-sm">
              <li>
                <Link className="hover:text-white" href="#">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link className="hover:text-white" href="#">
                  Artist Hub
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="md:pt-7">
            <h3 className="text-[#5B5C61] font-semibold mb-4">Support</h3>
            <ul className="space-y-4 text-sm">
              <li>
                <Link className="hover:text-white" href="#">
                  FAQ
                </Link>
              </li>
              <li>
                <Link className="hover:text-white" href="#">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link className="hover:text-white" href="#">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h3 className="text-[#5B5C61] font-semibold mb-4">Social Media</h3>
            <div className="space-y-4">
              <p className="text-sm mb-3">
                For recent updates and news follow our social media feeds.
              </p>
              <div className="flex space-x-4 text-xl">
                <Link className="hover:text-white" href="#">
                  <Youtube />
                </Link>
                <Link className="hover:text-white" href="#">
                  <Instagram />
                </Link>
                <Link className="hover:text-white" href="#">
                  <Facebook />
                </Link>
                <Link className="hover:text-white" href="#">
                  <Twitter />
                </Link>
                <Link className="hover:text-white" href="#">
                  <Mail />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
