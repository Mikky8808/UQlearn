import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Heart, 
  FolderPlus, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Star, 
  Clock, 
  Users, 
  BookOpen, 
  Sparkles,
  Share2,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { Course, CustomList } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { CourseCard } from '../../common/CourseCard';
import { DataNotFound } from '../../common/DataNotFound';
import { getWishlistApi, removeFromWishlistApi, getCuratedListsApi, saveCuratedListApi, deleteCuratedListApi } from '../../../lib/apiConfig';

interface LearnerWishlistTabProps {
  allCourses: Course[];
  onAddToCart: (course: Course) => void;
  onEnrollCourse: (course: Course) => void;
}

export const LearnerWishlistTab: React.FC<LearnerWishlistTabProps> = ({
  allCourses,
  onAddToCart,
  onEnrollCourse
}) => {
  const { formatPrice, getDiscountPercentage, currentUser } = useApp();
  const navigate = useNavigate();
  const [subTab, setSubTab] = useState<'wishlist' | 'custom-lists'>('wishlist');
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');

  // Wishlist item IDs
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);

  // Custom Playlists / Lists
  const [customLists, setCustomLists] = useState<CustomList[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const uid = currentUser?.id || 'guest';
        const wIds = await getWishlistApi(uid);
        setWishlistIds(Array.isArray(wIds) ? wIds : []);
        const lists = await getCuratedListsApi(uid);
        setCustomLists(Array.isArray(lists) ? lists : []);
      } catch {
        setWishlistIds([]);
        setCustomLists([]);
      }
    }
    loadData();
  }, [currentUser?.id]);

  const removeFromWishlist = async (courseId: string) => {
    const uid = currentUser?.id || 'guest';
    setWishlistIds(prev => prev.filter(id => id !== courseId));
    await removeFromWishlistApi(uid, courseId);
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    const uid = currentUser?.id || 'guest';

    const newList: CustomList = {
      id: `list-${Date.now()}`,
      name: newListName.trim(),
      description: newListDesc.trim() || 'Custom curated learning collection.',
      courseIds: [],
      createdAt: 'Just now'
    };

    const updated = [newList, ...customLists];
    setCustomLists(updated);
    setNewListName('');
    setNewListDesc('');
    setShowCreateListModal(false);
    await saveCuratedListApi(uid, newList);
  };

  const handleDeleteList = async (listId: string) => {
    const uid = currentUser?.id || 'guest';
    setCustomLists(prev => prev.filter(l => l.id !== listId));
    await deleteCuratedListApi(uid, listId);
  };

  const wishlistedCourses = allCourses.filter(c => wishlistIds.includes(c.id));

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex space-x-2">
          <button
            onClick={() => setSubTab('wishlist')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              subTab === 'wishlist'
                ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Heart className={`w-4 h-4 ${subTab === 'wishlist' ? 'fill-teal-600' : ''}`} />
            <span>Wishlist ({wishlistedCourses.length})</span>
          </button>

          <button
            onClick={() => setSubTab('custom-lists')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
              subTab === 'custom-lists'
                ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <FolderPlus className="w-4 h-4" />
            <span>My Curated Lists ({customLists.length})</span>
          </button>
        </div>

        {subTab === 'custom-lists' && (
          <button
            onClick={() => setShowCreateListModal(true)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create New List</span>
          </button>
        )}
      </div>

      {/* Wishlist View */}
      {subTab === 'wishlist' && (
        <div className="space-y-4">
          {wishlistedCourses.length === 0 ? (
            <DataNotFound
              title="Your Wishlist is Empty"
              message="Explore courses and click the heart icon on any course card to save it for later."
              icon={Heart}
              action={{
                label: "Browse Catalog",
                onClick: () => navigate('/courses'),
                icon: ArrowRight
              }}
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {wishlistedCourses.map((course) => (
                <div key={course.id} className="relative group">
                  <CourseCard
                    course={course}
                    formatPrice={formatPrice}
                    getDiscountPercentage={getDiscountPercentage}
                    navigate={navigate}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromWishlist(course.id);
                    }}
                    className="absolute top-5 right-5 p-2 rounded-full bg-slate-900/70 text-rose-400 hover:text-rose-300 backdrop-blur-xs transition-all opacity-0 group-hover:opacity-100 z-10 cursor-pointer shadow-lg"
                    title="Remove from wishlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div className="mt-3 grid grid-cols-2 gap-2 px-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(course);
                      }}
                      className="py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <ShoppingCart className="w-3 h-3" />
                      <span>Add to Cart</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEnrollCourse(course);
                        navigate(`/learn/${course.id}`);
                      }}
                      className="py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-[10px] rounded-lg shadow-sm transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <span>Enroll Now</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Custom Curated Lists */}
      {subTab === 'custom-lists' && (
        <div className="space-y-6">
          {customLists.length === 0 ? (
            <DataNotFound
              title="No Curated Lists Created"
              message="Organize your learning path by creating custom playlists and topic collections."
              icon={FolderPlus}
              action={{
                label: "Create New List",
                onClick: () => setShowCreateListModal(true),
                icon: Plus
              }}
            />
          ) : (
            customLists.map((list) => {
            const listCourses = allCourses.filter(c => list.courseIds.includes(c.id));

            return (
              <div
                key={list.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                      <FolderPlus className="w-4 h-4 text-teal-600" />
                      <span>{list.name}</span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{list.description}</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] text-slate-400">Created: {list.createdAt}</span>
                    <button
                      onClick={() => handleDeleteList(list.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                      title="Delete List"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {listCourses.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">
                    No courses added to this list yet. Browse courses and add them to this playlist.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {listCourses.map(c => (
                      <div
                        key={c.id}
                        className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center space-x-3 cursor-pointer hover:bg-teal-50/50 dark:hover:bg-teal-950/20 transition-all"
                        onClick={() => navigate(`/course/${c.id}`)}
                      >
                        <img src={c.image} alt={c.title} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{c.title}</p>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            <p className="text-[11px] font-black text-teal-600 dark:text-teal-400">{formatPrice(c.price)}</p>
                            {c.originalPrice && c.originalPrice > c.price && (
                              <>
                                <p className="text-[9px] text-slate-400 line-through">{formatPrice(c.originalPrice)}</p>
                                <p className="text-[9px] font-black text-rose-600 dark:text-rose-400">
                                  -{getDiscountPercentage(c.price, c.originalPrice)}%
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }))}
        </div>
      )}

      {/* Create List Modal */}
      {showCreateListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Create Custom Learning List</h3>
              <button
                onClick={() => setShowCreateListModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateList} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">List Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cloud & Kubernetes Mastery"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="What is the goal or focus of this playlist..."
                  value={newListDesc}
                  onChange={(e) => setNewListDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateListModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer"
                >
                  Create List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
