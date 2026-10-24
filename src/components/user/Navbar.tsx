import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ROOT_URL } from '../../lib/apiConfig';
import { 
  BookOpen, 
  Search, 
  ShoppingCart, 
  GraduationCap, 
  Menu, 
  X, 
  ChevronDown, 
  Sun, 
  Moon, 
  LogIn, 
  UserPlus, 
  LogOut, 
  Clock, 
  Sparkles, 
  Presentation,
  Compass,
  Coins,
  ShieldCheck,
  Share2,
  Gift,
  ChevronRight
} from 'lucide-react';
import { Course } from '../../types';
import { useApp, supportedCurrencies } from '../../context/AppContext';
import { BrandLogo } from '../common/BrandLogo';
import { TopAdvertBanner } from '../common/TopAdvertBanner';
import { isDeveloperUser } from '../../lib/developer';
import { getInstructorUrl } from '../../lib/apiConfig';

interface NavbarProps {
  cartCount: number;
  onOpenCart: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  currentUser: { name: string; email: string } | null;
  onOpenAuth?: (mode: 'login' | 'signup') => void;
  onLogout: () => void;
  courses: Course[];
  onOpenMainSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cartCount,
  onOpenCart,
  darkMode,
  onToggleDarkMode,
  currentUser,
  onOpenAuth,
  onLogout,
  courses,
  onOpenMainSidebar,
}) => {
  const { logoUrl, categories, selectedCurrency, setSelectedCurrency, setInviteModalOpen } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [instructorDropdownOpen, setInstructorDropdownOpen] = useState(false);
  const [exploreDropdownOpen, setExploreDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const searchRef = useRef<HTMLDivElement>(null);
  const exploreRef = useRef<HTMLDivElement>(null);
  const instructorRef = useRef<HTMLDivElement>(null);
  const currencyRef = useRef<HTMLDivElement>(null);

  const categoriesList = categories && categories.length > 0
    ? categories.filter(c => c.isActive !== false).map(c => c.name)
    : ['Development', 'Data Science', 'Design', 'Business', 'Marketing', 'Personal Growth'];

  // Sync searchQuery with URL if on /search or /courses
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q') || params.get('search') || '';
    if (location.pathname === '/search' || location.pathname === '/courses') {
      setSearchQuery(q);
    }
  }, [location.pathname, location.search]);

  // Autocomplete suggestions based on searchQuery and courses
  const matchingSuggestions = searchQuery.trim() === '' 
    ? ['Python for Beginners', 'React & TypeScript Masterclass', 'Data Science & Machine Learning', 'UI/UX Design Essentials', 'Digital Marketing 2026']
    : Array.from(new Set([
        ...courses
          .filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.category.toLowerCase().includes(searchQuery.toLowerCase()))
          .map(c => c.title),
        ...categoriesList.filter(cat => cat.toLowerCase().includes(searchQuery.toLowerCase()))
      ])).slice(0, 6);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
      if (exploreRef.current && !exploreRef.current.contains(event.target as Node)) {
        setExploreDropdownOpen(false);
      }
      if (instructorRef.current && !instructorRef.current.contains(event.target as Node)) {
        setInstructorDropdownOpen(false);
      }
      if (currencyRef.current && !currencyRef.current.contains(event.target as Node)) {
        setCurrencyDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (term: string) => {
    const trimmed = term.trim();
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/courses');
    }
    setIsSearchFocused(false);
    setMobileSearchOpen(false);
    setMobileMenuOpen(false);
  };

  const isCurrent = (path: string) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '/home';
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 shadow-sm border-b border-slate-200 dark:border-slate-800 transition-colors">
      {/* Top Advert Announcement Banner (shown before top nav) */}
      <TopAdvertBanner />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          
          {/* Logo & Categories */}
          <div className="flex items-center space-x-6">
            <BrandLogo 
              size="md" 
              to="/" 
              onClick={() => setMobileMenuOpen(false)} 
            />

            {/* Navigation Links */}
            <nav className="hidden lg:flex items-center space-x-1">
              <Link
                to="/"
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isCurrent('/')
                    ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-semibold' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                Home
              </Link>
              <div className="relative" ref={exploreRef}>
                <button
                  onClick={() => setExploreDropdownOpen(!exploreDropdownOpen)}
                  className={`flex items-center space-x-1 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isCurrent('/courses') || exploreDropdownOpen
                      ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-semibold' 
                      : 'text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>Explore</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${exploreDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {exploreDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 z-50 animate-fadeIn max-h-[420px] overflow-y-auto scrollbar-thin">
                    <div className="px-3 py-2 mb-1 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Categories</span>
                      <button
                        onClick={() => {
                          setExploreDropdownOpen(false);
                          navigate('/courses');
                        }}
                        className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-semibold"
                      >
                        View All
                      </button>
                    </div>

                    <div className="space-y-0.5">
                      <button
                        onClick={() => {
                          setExploreDropdownOpen(false);
                          navigate('/courses');
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/50 hover:text-teal-600 dark:hover:text-teal-400 transition-colors flex items-center justify-between group"
                      >
                        <span>All Courses</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                      </button>

                      {(categories && categories.length > 0 ? categories.filter(c => c.isActive !== false) : []).map(cat => (
                        <button
                          key={cat.id || cat.name}
                          onClick={() => {
                            setExploreDropdownOpen(false);
                            navigate(`/courses?category=${encodeURIComponent(cat.name)}`);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-950/50 hover:text-teal-600 dark:hover:text-teal-400 transition-colors flex items-center justify-between group"
                        >
                          <span className="line-clamp-1">{cat.name}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0 ml-2" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Link
                to="/dashboard"
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isCurrent('/dashboard') 
                    ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-semibold' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                My Learning
              </Link>

              {/* Become an Instructor Dropdown */}
              {!currentUser && (
                <div ref={instructorRef} className="relative">
                  <button
                    onClick={() => setInstructorDropdownOpen(!instructorDropdownOpen)}
                    className={`flex items-center space-x-1 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      isCurrent('/instructor') 
                        ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-semibold' 
                        : 'text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>Become an Instructor</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {instructorDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 z-50 animate-fadeIn space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-2 text-teal-600 dark:text-teal-400 font-bold text-xs uppercase tracking-wider">
                          <Presentation className="w-4 h-4" />
                          <span>Teach on UQlearn</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                          Every expert starts somewhere. Start your teaching journey and publish courses worldwide.
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setInstructorDropdownOpen(false);
                          window.location.href = getInstructorUrl();
                        }}
                        className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-md text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <span>Open Instructor Studio</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </nav>
          </div>

          {/* YouTube-style Search bar with autocomplete suggestions (Desktop) */}
          <div ref={searchRef} className="hidden md:flex items-center relative flex-1 max-w-sm mx-6">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3" />
              <input
                type="text"
                placeholder="Search for anything (e.g. Python, React)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchSubmit(searchQuery);
                  }
                }}
                className="w-full pl-11 pr-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 focus:bg-white dark:focus:bg-slate-800 border border-transparent focus:border-teal-500 rounded-full text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-teal-100 dark:focus:ring-teal-900 transition-all shadow-inner"
              />
            </div>

            {/* Suggestions Dropdown */}
            {isSearchFocused && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-fadeIn">
                <div className="px-4 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
                  <span>Suggestions</span>
                  <Sparkles className="w-3 h-3 text-teal-500" />
                </div>
                <div className="py-1">
                  {matchingSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSearchQuery(suggestion);
                        handleSearchSubmit(suggestion);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-slate-800 hover:text-teal-700 dark:hover:text-teal-400 flex items-center space-x-3 transition-colors cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{suggestion}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action items */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Mobile Search Icon Toggle */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="md:hidden p-2.5 text-slate-600 dark:text-slate-300 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors flex items-center justify-center cursor-pointer"
              title="Search"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={onToggleDarkMode}
              className="p-2.5 text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Cart Button */}
            <button
              onClick={onOpenCart}
              className="relative p-2.5 text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              title="Shopping Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-teal-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Currency Switcher */}
            <div ref={currencyRef} className="relative hidden sm:block">
              <button
                onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                className="flex items-center space-x-1.5 h-9 px-2.5 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-100 rounded-sm transition-all cursor-pointer border border-slate-200 dark:border-slate-700 shadow-2xs group"
                title={`Currency: ${selectedCurrency.code}`}
              >
                <span className="text-[11px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400">{selectedCurrency.code}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-400 transition-transform duration-200 ${currencyDropdownOpen ? 'rotate-180 text-teal-600 dark:text-teal-400' : 'group-hover:text-slate-600 dark:group-hover:text-slate-200'}`} />
              </button>

              {currencyDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 w-20 bg-white dark:bg-slate-900 rounded-sm shadow-xl border border-slate-200 dark:border-slate-800 py-1 z-50 animate-fadeIn overflow-hidden">
                  <div className="flex flex-col">
                    {supportedCurrencies.map((curr) => {
                      const isSelected = selectedCurrency.code === curr.code;
                      return (
                        <button
                          key={curr.code}
                          onClick={() => {
                            setSelectedCurrency(curr);
                            setCurrencyDropdownOpen(false);
                          }}
                          className={`w-full py-2.5 px-3 text-center text-xs tracking-wider transition-colors cursor-pointer block ${
                            isSelected
                              ? 'bg-[#e8f8f7] dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border-y border-teal-400/90 dark:border-teal-500/80 font-black'
                              : 'text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-bold'
                          }`}
                        >
                          {curr.code}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Auth / Profile Area */}
            <div className="hidden sm:block">
              {currentUser ? (
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-slate-800 focus:outline-none cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden xl:inline text-xs font-semibold text-slate-700 dark:text-slate-200">{currentUser.name}</span>
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-fadeIn">
                      <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{currentUser.name}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</p>
                      </div>
                      <Link
                        to="/dashboard"
                        onClick={() => setUserDropdownOpen(false)}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center space-x-2 transition-colors"
                      >
                        <GraduationCap className="w-4 h-4 text-teal-500" />
                        <span>My Learning Hub</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          setInviteModalOpen(true);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 flex items-center space-x-2 transition-colors cursor-pointer"
                      >
                        <Gift className="w-4 h-4 text-teal-500" />
                        <span>Invite Friend</span>
                      </button>

                      {isDeveloperUser(currentUser) && (
                        <div className="py-1 my-1 border-y border-slate-100 dark:border-slate-800 bg-amber-500/5">
                          <div className="px-4 py-1 text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            Developer Portals
                          </div>
                          <a
                            href={getInstructorUrl()}
                            onClick={() => setUserDropdownOpen(false)}
                            className="w-full text-left px-4 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 flex items-center space-x-2 transition-colors"
                          >
                            <Presentation className="w-4 h-4" />
                            <span>Instructor Studio</span>
                          </a>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          onLogout();
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center space-x-2 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                  <Link
                    to="/login"
                    className="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/signup"
                    className="px-4 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-xl shadow-md transition-all"
                  >
                    Sign up
                  </Link>
                </div>
              )}
            </div>

            {/* Right Hamburger Navigation Button */}
            <button
              onClick={() => {
                if (onOpenMainSidebar) {
                  onOpenMainSidebar();
                } else {
                  setMobileMenuOpen(true);
                }
              }}
              className="p-2.5 text-slate-700 dark:text-slate-200 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all flex items-center justify-center border border-slate-200 dark:border-slate-700 cursor-pointer shadow-xs group"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>

          </div>
        </div>

        {/* Mobile Search Input Bar Below Nav */}
        {mobileSearchOpen && (
          <div className="md:hidden pb-3.5 pt-1 px-1 border-t border-slate-100 dark:border-slate-800 animate-fadeIn">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3" />
              <input
                type="text"
                placeholder="Search courses, categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchSubmit(searchQuery);
                  }
                }}
                autoFocus
                className="w-full pl-11 pr-10 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-800 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all shadow-inner"
              />
              <button
                onClick={() => setMobileSearchOpen(false)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Suggestions list for mobile search */}
            <div className="mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5">
              {matchingSuggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSearchQuery(suggestion);
                    handleSearchSubmit(suggestion);
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-slate-800 hover:text-teal-700 dark:hover:text-teal-400 flex items-center space-x-3 transition-colors cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{suggestion}</span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </header>
  );
};
