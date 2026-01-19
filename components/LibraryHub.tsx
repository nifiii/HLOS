import React, { useState, useEffect, useMemo } from 'react';
import { Library, Search, Filter, Plus } from 'lucide-react';
import { EBook, IndexStatus } from '../types';
import { BookUploader } from './BookUploader';
import { BookMetadataEditor } from './BookMetadataEditor';
import { BookCard } from './BookCard';
import { getAllBooks, saveBook, deleteBook, getBooksByOwnerId } from '../services/bookStorage';

interface LibraryHubProps {
  currentUserId: string;
}

type ViewMode = 'grid' | 'upload' | 'edit';

const LibraryHub: React.FC<LibraryHubProps> = ({ currentUserId }) => {
  const [books, setBooks] = useState<EBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [editingBook, setEditingBook] = useState<Partial<EBook> | null>(null);
  const [pendingUpload, setPendingUpload] = useState<any>(null);

  // 筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterGrade, setFilterGrade] = useState<string>('all');

  // 加载图书列表
  useEffect(() => {
    loadBooks();
  }, [currentUserId]);

  const loadBooks = async () => {
    try {
      setLoading(true);
      const allBooks = await getAllBooks();
      // 过滤：显示当前用户的书 + 共享的书
      const filtered = allBooks.filter(
        (book) => book.ownerId === currentUserId || book.ownerId === 'shared'
      );
      setBooks(filtered);
    } catch (error) {
      console.error('加载图书失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 处理上传成功
  const handleUploadSuccess = (uploadResult: any) => {
    // 保存上传结果，等待用户编辑元数据
    setPendingUpload(uploadResult);
    const bookDraft: Partial<EBook> = {
      id: `book-${Date.now()}`,
      title: uploadResult.metadata.title,
      author: uploadResult.metadata.author,
      subject: uploadResult.metadata.subject,
      category: uploadResult.metadata.category,
      grade: uploadResult.metadata.grade,
      tags: uploadResult.metadata.tags,
      tableOfContents: uploadResult.metadata.tableOfContents,
      fileFormat: uploadResult.fileFormat,
      fileSize: uploadResult.fileSize,
      uploadedAt: Date.now(),
      ownerId: currentUserId,
      indexStatus: IndexStatus.PENDING,
    };
    setEditingBook(bookDraft);
    setViewMode('edit');
  };

  // 保存图书元数据
  const handleSaveMetadata = async (metadata: Partial<EBook>) => {
    try {
      const newBook: EBook = {
        ...(metadata as EBook),
        id: metadata.id || `book-${Date.now()}`,
        uploadedAt: metadata.uploadedAt || Date.now(),
        ownerId: currentUserId,
        indexStatus: IndexStatus.PENDING,
        fileFormat: metadata.fileFormat || pendingUpload?.fileFormat || 'pdf',
        fileSize: metadata.fileSize || pendingUpload?.fileSize || 0,
        tags: metadata.tags || [],
        tableOfContents: metadata.tableOfContents || [],
      };

      await saveBook(newBook);
      await loadBooks();

      // TODO: 后续调用 AnythingLLM 索引 API
      // await indexBookToAnythingLLM(newBook, pendingUpload.content);

      setPendingUpload(null);
      setEditingBook(null);
      setViewMode('grid');
    } catch (error) {
      console.error('保存图书失败:', error);
      alert('保存失败，请重试');
    }
  };

  // 删除图书
  const handleDeleteBook = async (bookId: string) => {
    if (!confirm('确定要删除这本书吗？')) return;

    try {
      await deleteBook(bookId);
      await loadBooks();
    } catch (error) {
      console.error('删除图书失败:', error);
      alert('删除失败，请重试');
    }
  };

  // 编辑图书
  const handleEditBook = (book: EBook) => {
    setEditingBook(book);
    setViewMode('edit');
  };

  // 选择图书（进入学习园地）
  const handleSelectBook = (book: EBook) => {
    // TODO: 跳转到学习园地，传递图书信息
    console.log('选择图书:', book.title);
    alert(`即将进入《${book.title}》的学习园地`);
  };

  // 筛选图书
  const filteredBooks = useMemo(() => {
    return books.filter((book) => {
      // 搜索关键词
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchTitle = book.title.toLowerCase().includes(query);
        const matchAuthor = book.author?.toLowerCase().includes(query);
        const matchTags = book.tags?.some((tag) => tag.toLowerCase().includes(query));
        if (!matchTitle && !matchAuthor && !matchTags) return false;
      }

      // 学科筛选
      if (filterSubject !== 'all' && book.subject !== filterSubject) return false;

      // 类别筛选
      if (filterCategory !== 'all' && book.category !== filterCategory) return false;

      // 年级筛选
      if (filterGrade !== 'all' && book.grade !== filterGrade) return false;

      return true;
    });
  }, [books, searchQuery, filterSubject, filterCategory, filterGrade]);

  // 获取学科列表
  const subjects = useMemo(() => {
    const uniqueSubjects = Array.from(new Set(books.map((b) => b.subject)));
    return uniqueSubjects;
  }, [books]);

  // 获取类别列表
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(books.map((b) => b.category)));
    return uniqueCategories;
  }, [books]);

  // 渲染网格视图
  const renderGridView = () => (
    <>
      {/* 顶部操作栏 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          {/* 搜索框 */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索书名、作者、标签..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 筛选器 */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <select
              value={filterSubject}
              onChange={(e) => setFilterSubject(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">全部学科</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">全部类别</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">全部年级</option>
              <option value="小学">小学</option>
              <option value="初中">初中</option>
              <option value="高中">高中</option>
            </select>
          </div>

          {/* 上传按钮 */}
          <button
            onClick={() => setViewMode('upload')}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            上传图书
          </button>
        </div>
      </div>

      {/* 图书网格 */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">加载中...</div>
      ) : filteredBooks.length === 0 ? (
        <div className="text-center py-12">
          <Library className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">暂无图书</p>
          <button
            onClick={() => setViewMode('upload')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            立即上传第一本书
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onSelect={handleSelectBook}
              onEdit={handleEditBook}
              onDelete={handleDeleteBook}
            />
          ))}
        </div>
      )}
    </>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 标题栏 */}
      <div className="flex items-center gap-3 mb-6">
        <Library className="w-8 h-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-800">图书馆</h2>
          <p className="text-sm text-gray-600">管理您的电子教材和学习资料</p>
        </div>
      </div>

      {/* 视图切换 */}
      {viewMode === 'grid' && renderGridView()}
      {viewMode === 'upload' && (
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setViewMode('grid')}
            className="mb-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← 返回图书馆
          </button>
          <BookUploader onUploadSuccess={handleUploadSuccess} ownerId={currentUserId} />
        </div>
      )}
      {viewMode === 'edit' && editingBook && (
        <div className="max-w-4xl mx-auto">
          <BookMetadataEditor
            initialMetadata={editingBook}
            onSave={handleSaveMetadata}
            onCancel={() => {
              setEditingBook(null);
              setPendingUpload(null);
              setViewMode('grid');
            }}
          />
        </div>
      )}
    </div>
  );
};

export default LibraryHub;
