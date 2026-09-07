'use client';

import { useEffect, useState } from 'react';
import {
    Plus,
    Pencil,
    Trash2,
    Search,
    FolderTree,
    CheckCircle2,
    EyeOff,
    Filter,
    Layers,
    Tag,
    Sparkles,
    RefreshCw,
    ToggleLeft,
    ToggleRight,
} from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import DataTable from '@/components/admin/DataTable';
import Modal, { ConfirmModal } from '@/components/admin/Modal';
import { categoriesService, CreateCategoryDto } from '@/lib/services/admin/categories-service';
import { Category } from '@/lib/services/admin/dashboard-service';

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'hidden'>('all');

    // Modal states
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Form state
    const [formData, setFormData] = useState<CreateCategoryDto>({
        name: '',
        slug: '',
        description: '',
        status: 'Active',
    });

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-');
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        setLoading(true);
        try {
            const data = await categoriesService.getAll();
            setCategories(data);
        } catch (error) {
            console.error('Error loading categories:', error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setSelectedCategory(null);
        setFormData({
            name: '',
            slug: '',
            description: '',
            status: 'Active',
        });
        setIsFormOpen(true);
    };

    const openEditModal = (category: Category) => {
        setSelectedCategory(category);
        setFormData({
            name: category.name || '',
            slug: category.slug || generateSlug(category.name || ''),
            description: category.description || '',
            status: category.status || 'Active',
        });
        setIsFormOpen(true);
    };

    const openDeleteModal = (category: Category) => {
        setSelectedCategory(category);
        setIsDeleteOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || formData.name.trim().length < 2) {
            alert('Tên danh mục phải có ít nhất 2 ký tự');
            return;
        }

        setFormLoading(true);

        try {
            if (selectedCategory) {
                await categoriesService.update(selectedCategory.id, formData);
            } else {
                await categoriesService.create(formData);
            }
            setIsFormOpen(false);
            loadCategories();
        } catch (error: unknown) {
            console.error('Error saving category:', error);
            alert('Có lỗi xảy ra khi lưu danh mục!');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedCategory) return;
        setFormLoading(true);

        try {
            await categoriesService.delete(selectedCategory.id);
            setIsDeleteOpen(false);
            loadCategories();
        } catch (error) {
            console.error('Error deleting category:', error);
            alert('Có lỗi xảy ra khi xóa!');
        } finally {
            setFormLoading(false);
        }
    };

    const toggleStatus = async (category: Category) => {
        const newStatus = category.status?.toLowerCase() === 'active' ? 'Hidden' : 'Active';
        try {
            await categoriesService.update(category.id, {
                name: category.name,
                slug: category.slug,
                description: category.description,
                status: newStatus,
            });
            loadCategories();
        } catch (error) {
            console.error('Error toggling category status:', error);
        }
    };

    // Filter categories
    const filteredCategories = categories.filter((cat) => {
        const matchesSearch =
            cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (cat.description && cat.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (cat.slug && cat.slug.toLowerCase().includes(searchQuery.toLowerCase()));

        const isActive = cat.status?.toLowerCase() === 'active';
        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'active' && isActive) ||
            (statusFilter === 'hidden' && !isActive);

        return matchesSearch && matchesStatus;
    });

    const activeCount = categories.filter((c) => c.status?.toLowerCase() === 'active').length;
    const hiddenCount = categories.length - activeCount;

    const columns = [
        {
            key: 'id',
            header: 'ID',
            width: '70px',
        },
        {
            key: 'name',
            header: 'Tên danh mục & Slug',
            render: (item: Category) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center flex-shrink-0 font-bold border border-violet-200 dark:border-violet-800">
                        <FolderTree className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-white text-sm truncate">
                            {item.name}
                        </p>
                        <span className="text-xs text-gray-400 font-mono">/{item.slug}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'description',
            header: 'Mô tả',
            render: (item: Category) => (
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-xs leading-relaxed">
                    {item.description || 'Chưa có mô tả'}
                </p>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (item: Category) => {
                const isActive = item.status?.toLowerCase() === 'active';
                return (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleStatus(item);
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full transition-all ${
                            isActive
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200'
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200'
                        }`}
                        title="Nhấn để chuyển trạng thái"
                    >
                        {isActive ? (
                            <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                Hoạt động
                            </>
                        ) : (
                            <>
                                <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                                Tạm ẩn
                            </>
                        )}
                    </button>
                );
            },
        },
        {
            key: 'actions',
            header: 'Thao tác',
            render: (item: Category) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(item);
                        }}
                        className="p-2 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 transition-colors"
                        title="Sửa danh mục"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            openDeleteModal(item);
                        }}
                        className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors"
                        title="Xóa danh mục"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="min-h-screen pb-12 space-y-6">
            <AdminHeader
                title="Quản Lý Danh Mục Sản Phẩm"
                subtitle="Tổ chức và phân loại hệ thống danh mục trên sàn thương mại điện tử ShopTTS"
            />

            <div className="p-6 space-y-6">
                {/* Stats Metric Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Tổng danh mục
                            </span>
                            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                                {loading ? '...' : categories.length}
                            </h2>
                        </div>
                        <div className="p-3 bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-2xl">
                            <Layers className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Đang hoạt động
                            </span>
                            <h2 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                                {loading ? '...' : activeCount}
                            </h2>
                        </div>
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
                        <div>
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Tạm ẩn
                            </span>
                            <h2 className="text-2xl font-extrabold text-gray-600 dark:text-gray-400 mt-1">
                                {loading ? '...' : hiddenCount}
                            </h2>
                        </div>
                        <div className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-2xl">
                            <EyeOff className="w-6 h-6" />
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex flex-wrap items-center gap-3 flex-1">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[240px]">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm theo tên danh mục, slug, mô tả..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 pr-4 py-2.5 w-full border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="flex items-center bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
                            {(
                                [
                                    { id: 'all', label: 'Tất cả' },
                                    { id: 'active', label: 'Hoạt động' },
                                    { id: 'hidden', label: 'Tạm ẩn' },
                                ] as const
                            ).map((st) => (
                                <button
                                    key={st.id}
                                    onClick={() => setStatusFilter(st.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                        statusFilter === st.id
                                            ? 'bg-white dark:bg-gray-800 text-violet-600 dark:text-violet-400 shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                                >
                                    {st.label}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={loadCategories}
                            disabled={loading}
                            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                            title="Tải lại danh sách"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <button
                        onClick={openCreateModal}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-xs transition-colors shadow-md shadow-violet-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        Thêm danh mục mới
                    </button>
                </div>

                {/* Table */}
                <DataTable
                    columns={columns}
                    data={filteredCategories}
                    loading={loading}
                    keyExtractor={(item) => item.id}
                    emptyMessage="Chưa có danh mục nào phù hợp"
                    onRowClick={(item) => openEditModal(item)}
                />
            </div>

            {/* Create/Edit Inline Modal */}
            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={selectedCategory ? `Chỉnh sửa danh mục: "${selectedCategory.name}"` : 'Thêm danh mục mới'}
                size="md"
                footer={
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setIsFormOpen(false)}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-sm font-medium"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={formLoading || !formData.name}
                            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
                        >
                            {formLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            {selectedCategory ? 'Lưu cập nhật' : 'Tạo danh mục'}
                        </button>
                    </div>
                }
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Tên danh mục *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => {
                                const name = e.target.value;
                                setFormData({
                                    ...formData,
                                    name,
                                    slug: generateSlug(name),
                                });
                            }}
                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-violet-500 outline-none text-sm"
                            placeholder="Ví dụ: Thiết bị điện tử, Thời trang nam..."
                            required
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Slug (Đường dẫn chuẩn) *
                        </label>
                        <input
                            type="text"
                            value={formData.slug}
                            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-violet-500 outline-none text-sm font-mono"
                            placeholder="thiet-bi-dien-tu"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Trạng thái hiển thị
                        </label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm outline-none"
                        >
                            <option value="Active">Hoạt động (Active)</option>
                            <option value="Hidden">Tạm ẩn (Hidden)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            Mô tả danh mục
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-violet-500 outline-none text-sm resize-none"
                            rows={3}
                            placeholder="Mô tả ngắn gọn về nhóm danh mục này..."
                        />
                    </div>
                </form>
            </Modal>

            {/* Delete Modal */}
            <ConfirmModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={handleDelete}
                title="Xóa danh mục"
                message={`Bạn có chắc chắn muốn xóa danh mục "${selectedCategory?.name}"?`}
                confirmText="Xóa danh mục"
                loading={formLoading}
            />
        </div>
    );
}
