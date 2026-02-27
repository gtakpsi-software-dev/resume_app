import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Redesigned Hero Section with Side-by-Side Layout */}
      <section className="relative py-6 md:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-center">
            {/* Left Side - Logo and Title */}
            <div className="text-center lg:text-left order-2 lg:order-1">
              <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-[#1d1d1f] mb-2">
                Alpha Kappa Psi
              </h1>
              <p className="text-xl sm:text-2xl font-medium tracking-tight text-[#1d1d1f] mb-2">
                Georgia Tech&apos;s Premier Professional Business Fraternity
              </p>
              <p className="text-lg text-[#6e6e73] mb-4">
                Building principled business leaders through professional development, brotherhood, and service since 1904.
              </p>
              <div className="mt-1 flex flex-wrap gap-3 justify-center lg:justify-start">
                <Link href="/search" className="btn-apple">
                  Search Resumes
                </Link>
                <Link href="/alumni" className="btn-apple-secondary">
                  View Alumni
                </Link>
              </div>
            </div>

            {/* Right Side - Logo with Glow */}
            <div className="flex justify-center lg:justify-center order-1 lg:order-2 lg:pl-20 pb-2">
              <div className="relative w-[320px] h-[320px] flex items-center justify-center">
                {/* Adjusted blue glow visible at the edges of the logo */}
                <div 
                  className="absolute inset-0 z-0" 
                  style={{
                    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.7) 50%, rgba(59, 130, 246, 0.4) 60%, rgba(59, 130, 246, 0.2) 70%, rgba(255, 255, 255, 0) 75%)',
                    filter: 'blur(16px)'
                  }}
                ></div>
                <Image 
                  src="/gtakpsi_logo.png" 
                  alt="Alpha Kappa Psi Georgia Tech Logo" 
                  width={320} 
                  height={320}
                  priority
                  loading="eager"
                  placeholder="empty"
                  className="h-auto object-contain relative z-10"
                  style={{ 
                    filter: 'drop-shadow(0 0 9px rgba(59, 130, 246, 0.4))'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Now visible without scrolling */}
      <section className="py-8 bg-[#f5f5f7] flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-[#1d1d1f] mb-3">
              Resume Repository
            </h2>
            <p className="text-base text-[#6e6e73] max-w-3xl mx-auto mb-6">
              Connect with our talented members and discover the perfect candidate for your opportunity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-4 mx-auto md:mx-0">
                <svg className="w-5 h-5 text-[#0071e3]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-[#1d1d1f] text-center md:text-left mb-2">Smart Search</h3>
              <p className="text-sm text-[#6e6e73] text-center md:text-left">
                Find members by skills, major, graduation year, or previous companies with our intuitive search interface.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-4 mx-auto md:mx-0">
                <svg className="w-5 h-5 text-[#0071e3]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-[#1d1d1f] text-center md:text-left mb-2">Resume Viewer</h3>
              <p className="text-sm text-[#6e6e73] text-center md:text-left">
                Preview resumes directly in your browser or download them for future reference.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mb-4 mx-auto md:mx-0">
                <svg className="w-5 h-5 text-[#0071e3]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-[#1d1d1f] text-center md:text-left mb-2">Diverse Talent</h3>
              <p className="text-sm text-[#6e6e73] text-center md:text-left">
                Access a diverse pool of talented Georgia Tech students across various majors and industries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#f5f5f7] py-4 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm text-[#6e6e73]">
              © {new Date().getFullYear()} Alpha Kappa Psi - Georgia Tech Chapter. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
