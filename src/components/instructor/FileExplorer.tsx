import React, { useState, useEffect, useCallback } from 'react';
import { 
  Folder, 
  File, 
  MoreVertical, 
  Plus, 
  FolderPlus, 
  ChevronRight, 
  ChevronDown, 
  Edit2, 
  Trash2, 
  ExternalLink,
  Download,
  FolderOpen,
  ArrowLeft,
  Search,
  Grid,
  List as ListIcon,
  Video,
  FileText,
  File as FileIcon,
  X,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { API_ENDPOINTS, apiFetch } from '../../lib/apiConfig';
import { VideoPlayerWithFallback } from '../common/VideoPlayerWithFallback';

interface Asset {
  id: number;
  user_id: string;
  folder_id: number | null;
  filename: string;
  original_name: string;
  file_url: string;
  file_type: string;
  category: 'lecture' | 'resource';
  file_size: number;
  created_at: string;
}

interface AssetFolder {
  id: number;
  user_id: string;
  name: string;
  parent_id: number | null;
  created_at: string;
}

export const FileExplorer: React.FC = () => {
  const { currentUser } = useApp();
  const [folders, setFolders] = useState<AssetFolder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renamingName, setRenamingName] = useState('');
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);

  const fetchAssets = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const result = await apiFetch(`assets.php?user_id=${currentUser.id}&action=list`);
      if (result.success) {
        setFolders(result.data.folders);
        setAssets(result.data.assets);
      }
    } catch (error) {
      console.error("Error fetching assets:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const createFolder = async () => {
    if (!newFolderName.trim() || !currentUser?.id) return;
    try {
      const result = await apiFetch('assets.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create_folder',
          user_id: currentUser.id,
          name: newFolderName,
          parent_id: currentFolderId
        })
      });
      if (result.success) {
        setNewFolderName('');
        setIsCreatingFolder(false);
        fetchAssets();
      }
    } catch (error) {
      console.error("Error creating folder:", error);
    }
  };

  const renameFolder = async (id: number) => {
    if (!renamingName.trim() || !currentUser?.id) return;
    try {
      const result = await apiFetch('assets.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'rename_folder',
          user_id: currentUser.id,
          folder_id: id,
          name: renamingName
        })
      });
      if (result.success) {
        setRenamingId(null);
        setRenamingName('');
        fetchAssets();
      }
    } catch (error) {
      console.error("Error renaming folder:", error);
    }
  };

  const deleteFolder = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this folder? Assets inside will be moved to the root.") || !currentUser?.id) return;
    try {
      const result = await apiFetch(`assets.php?user_id=${currentUser.id}&action=delete_folder&id=${id}`, {
        method: 'DELETE'
      });
      if (result.success) {
        fetchAssets();
      }
    } catch (error) {
      console.error("Error deleting folder:", error);
    }
  };

  const deleteAsset = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this asset?") || !currentUser?.id) return;
    try {
      const result = await apiFetch(`assets.php?user_id=${currentUser.id}&action=delete_asset&id=${id}`, {
        method: 'DELETE'
      });
      if (result.success) {
        fetchAssets();
      }
    } catch (error) {
      console.error("Error deleting asset:", error);
    }
  };

  const moveAsset = async (assetId: number, folderId: number | null) => {
    if (!currentUser?.id) return;
    try {
      const result = await apiFetch('assets.php', {
        method: 'POST',
        body: JSON.stringify({
          action: 'move_asset',
          user_id: currentUser.id,
          asset_id: assetId,
          folder_id: folderId
        })
      });
      if (result.success) {
        fetchAssets();
      }
    } catch (error) {
      console.error("Error moving asset:", error);
    }
  };

  const filteredFolders = folders.filter(f => 
    f.parent_id === currentFolderId && 
    (searchQuery === '' || f.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredAssets = assets.filter(a => 
    a.folder_id === currentFolderId && 
    (searchQuery === '' || a.original_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const breadcrumbs = [];
  let tempId = currentFolderId;
  while (tempId !== null) {
    const folder = folders.find(f => f.id === tempId);
    if (folder) {
      breadcrumbs.unshift(folder);
      tempId = folder.parent_id;
    } else {
      tempId = null;
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (category: string, type: string) => {
    if (category === 'lecture') return <Video className="w-5 h-5 text-teal-500" />;
    if (type.includes('pdf')) return <FileText className="w-5 h-5 text-rose-500" />;
    return <FileIcon className="w-5 h-5 text-slate-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-teal-500 outline-none w-full sm:w-64"
            />
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow-sm text-teal-600' : 'text-slate-500'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-teal-600' : 'text-slate-500'}`}
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
          <button 
            onClick={() => setIsCreatingFolder(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-900/20 transition-all cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>New Folder</span>
          </button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center space-x-2 text-xs font-bold overflow-x-auto pb-2 scrollbar-hide">
        <button 
          onClick={() => setCurrentFolderId(null)}
          className={`flex items-center space-x-1 shrink-0 ${currentFolderId === null ? 'text-teal-600' : 'text-slate-500 hover:text-slate-900'}`}
        >
          <Folder className="w-3.5 h-3.5" />
          <span>Root</span>
        </button>
        {breadcrumbs.map((folder, idx) => (
          <React.Fragment key={folder.id}>
            <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
            <button 
              onClick={() => setCurrentFolderId(folder.id)}
              className={`shrink-0 ${idx === breadcrumbs.length - 1 ? 'text-teal-600' : 'text-slate-500 hover:text-slate-900'}`}
            >
              {folder.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Main Area */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-slate-500">Loading your library...</p>
          </div>
        ) : (
          <>
            <AnimatePresence>
              {isCreatingFolder && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/30 rounded-2xl flex items-center space-x-4"
                >
                  <Folder className="w-5 h-5 text-teal-600" />
                  <input 
                    autoFocus
                    type="text"
                    placeholder="Folder name..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createFolder()}
                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-slate-900 dark:text-slate-100 placeholder:text-teal-300"
                  />
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => setIsCreatingFolder(false)}
                      className="p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={createFolder}
                      className="px-4 py-1.5 bg-teal-600 text-white font-bold text-[10px] uppercase tracking-widest rounded-lg"
                    >
                      Create
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {filteredFolders.length === 0 && filteredAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-center space-y-4">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center">
                  <FolderOpen className="w-8 h-8 text-slate-300" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100">Empty Folder</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">This folder has no files or subfolders yet.</p>
                </div>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4" : "space-y-1"}>
                {/* Folders */}
                {filteredFolders.map(folder => (
                  <motion.div 
                    key={folder.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={viewMode === 'grid' 
                      ? "group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:border-teal-500 hover:shadow-lg transition-all cursor-pointer"
                      : "group flex items-center justify-between p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
                    }
                  >
                    <div 
                      className={viewMode === 'grid' ? "flex flex-col items-center space-y-3" : "flex items-center space-x-4 flex-1"}
                      onClick={() => setCurrentFolderId(folder.id)}
                    >
                      <div className={viewMode === 'grid' ? "w-12 h-12 bg-teal-50 dark:bg-teal-900/20 rounded-xl flex items-center justify-center text-teal-600" : "text-teal-600"}>
                        <Folder className={viewMode === 'grid' ? "w-6 h-6" : "w-5 h-5"} fill="currentColor" fillOpacity={0.2} />
                      </div>
                      {renamingId === folder.id ? (
                        <input 
                          autoFocus
                          value={renamingName}
                          onChange={(e) => setRenamingName(e.target.value)}
                          onBlur={() => renameFolder(folder.id)}
                          onKeyDown={(e) => e.key === 'Enter' && renameFolder(folder.id)}
                          className="w-full text-center text-xs font-bold bg-slate-50 dark:bg-slate-800 border-none rounded-lg focus:ring-1 focus:ring-teal-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="text-xs font-black text-slate-900 dark:text-slate-100 truncate w-full text-center">
                          {folder.name}
                        </span>
                      )}
                    </div>
                    
                    <div className={viewMode === 'grid' ? "absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" : "flex items-center space-x-2"}>
                      <div className="flex items-center bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 rounded-lg overflow-hidden">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenamingId(folder.id);
                            setRenamingName(folder.name);
                          }}
                          className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteFolder(folder.id);
                          }}
                          className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Assets */}
                {filteredAssets.map(asset => (
                  <motion.div 
                    key={asset.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={viewMode === 'grid' 
                      ? "group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 hover:border-slate-400 transition-all"
                      : "group flex items-center justify-between p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
                    }
                  >
                    <div className={viewMode === 'grid' ? "flex flex-col items-center space-y-3" : "flex items-center space-x-4 flex-1 min-w-0"}>
                      <div className={viewMode === 'grid' ? "w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center" : "shrink-0"}>
                        {getFileIcon(asset.category, asset.file_type)}
                      </div>
                      <div className={viewMode === 'grid' ? "text-center w-full min-w-0" : "flex-1 min-w-0"}>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {asset.original_name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                          {formatSize(asset.file_size)} • {asset.file_type.toUpperCase()}
                        </p>
                      </div>
                    </div>

                    <div className={viewMode === 'grid' ? "absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" : "flex items-center space-x-2"}>
                      <div className="flex items-center bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setPreviewAsset(asset)}
                          className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <a 
                          href={asset.file_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <div className="relative group/folder">
                          <button className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600">
                            <FolderPlus className="w-3.5 h-3.5" />
                          </button>
                          <div className="absolute right-0 top-full pt-2 opacity-0 group-hover/folder:opacity-100 pointer-events-none group-hover/folder:pointer-events-auto transition-all z-20">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-2 min-w-[160px] max-h-[200px] overflow-y-auto">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest p-2 border-b border-slate-100 dark:border-slate-800 mb-1">Move to:</p>
                              <button 
                                onClick={() => moveAsset(asset.id, null)}
                                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 flex items-center space-x-2"
                              >
                                <ArrowLeft className="w-3 h-3" />
                                <span>Root Directory</span>
                              </button>
                              {folders.filter(f => f.id !== asset.folder_id).map(f => (
                                <button 
                                  key={f.id}
                                  onClick={() => moveAsset(asset.id, f.id)}
                                  className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 flex items-center space-x-2"
                                >
                                  <Folder className="w-3 h-3" />
                                  <span>{f.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => deleteAsset(asset.id)}
                          className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewAsset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm"
            onClick={() => setPreviewAsset(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-4 w-full max-w-4xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{previewAsset.original_name}</p>
                <button 
                  onClick={() => setPreviewAsset(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center overflow-hidden relative">
                {previewAsset.file_type.includes('video') ? (
                  <VideoPlayerWithFallback src={previewAsset.file_url} className="w-full h-full object-contain" />
                ) : previewAsset.file_type.includes('pdf') ? (
                  <iframe src={previewAsset.file_url} className="w-full h-full" />
                ) : (
                  <p className="text-sm text-slate-500">Preview not available for this file type.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
