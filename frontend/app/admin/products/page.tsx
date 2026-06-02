'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, Package, Filter } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import DataTable from '@/components/admin/DataTable';
import Modal, { ConfirmModal } from '@/components/admin/Modal';
import ImageUpload from '@/components/admin/ImageUpload';
import { productsService, CreateProductDto } from '@/lib/services/admin/products-service';
import { categoriesService } from '@/lib/services/admin/categories-service';
import { brandsService } from '@/lib/services/admin/brands-service';
import { Product, Category, Brand } from '@/lib/services/admin/dashboard-service';

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);

    // Filters
    const [page, setPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<number | undefined>();
    const [brandFilter, setBrandFilter] = useState<number | undefined>();

    // Modal states
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Form state
    const [formData, setFormData] = useState<CreateProductDto>({
        name: '',
        slug: '',
        description: '',
        price: 0,
        capitalPrice: 0,
        quantity: 0,
        image: '',
        categoryId: 0,
        brandId: 0,
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
        loadFilters();
    }, []);

    useEffect(() => {
        loadProducts();
    }, [page, categoryFilter, brandFilter]);

    const loadFilters = async () => {
        const [cats, brs] = await Promise.all([
            categoriesService.getAll(),
            brandsService.getAll(),
        ]);
        setCategories(cats);
        setBrands(brs);
    };

    const loadProducts = async () => {
        setLoading(true);
        try {
            const res = await productsService.getAll({
                page,
                pageSize: 10,
                search: searchQuery || undefined,
                categoryId: categoryFilter,
                brandId: brandFilter,
            });
            setProducts(res.items);
            setTotalCount(res.totalCount);
        } catch (error) {
            console.error('Error loading products:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setPage(1);
        loadProducts();
    };

    const openCreateModal = () => {
        setSelectedProduct(null);
        setFormData({
            name: '',
            slug: '',
            description: '',
            price: 0,
            capitalPrice: 0,
            quantity: 0,
            image: '',
            categoryId: categories[0]?.id || 0,
            brandId: brands[0]?.id || 0,
        });
        setIsFormOpen(true);
    };

    const openEditModal = (product: Product) => {
        setSelectedProduct(product);
        setFormData({
            name: product.name || '',
            slug: product.slug || generateSlug(product.name || ''),
            description: product.description || '',
            price: product.price ?? 0,
            capitalPrice: product.capitalPrice ?? 0,
            quantity: product.quantity ?? 0,
            image: product.image || '',
            categoryId: product.categoryId || 0,
            brandId: product.brandId || 0,
        });
        setIsFormOpen(true);
    };

    const openDeleteModal = (product: Product) => {
        setSelectedProduct(product);
        setIsDeleteOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Frontend validation
        if (!formData.name || formData.name.length < 4) {
            alert('Tên sản phẩm phải có ít nhất 4 ký tự');
            return;
        }
        if (!formData.slug) {
            alert('Slug không được để trống');
            return;
        }
        if (!formData.description || formData.description.length < 10) {
            alert('Mô tả sản phẩm phải có ít nhất 10 ký tự');
            return;
        }
        if (formData.price <= 0) {
            alert('Giá bán phải lớn hơn 0');
            return;
        }
        if (formData.capitalPrice <= 0) {
            alert('Giá vốn phải lớn hơn 0');
            return;
        }
        if (formData.capitalPrice >= formData.price) {
            alert('Giá vốn phải nhỏ hơn giá bán');
            return;
        }
        if (!formData.image) {
            alert('Vui lòng upload ảnh sản phẩm');
            return;
        }
        if (!formData.categoryId || formData.categoryId <= 0) {
            alert('Vui lòng chọn danh mục');
            return;
        }
        if (!formData.brandId || formData.brandId <= 0) {
            alert('Vui lòng chọn thương hiệu');
            return;
        }

        setFormLoading(true);

        try {
            if (selectedProduct) {
                await productsService.update(selectedProduct.id, formData);
            } else {
                await productsService.create(formData);
            }
            setIsFormOpen(false);
            loadProducts();
        } catch (error: unknown) {
            const apiError = error as { response?: { data?: { message?: string; title?: string } } };
            console.error('Error saving product:', error);
            const message = apiError.response?.data?.message || apiError.response?.data?.title || 'Có lỗi xảy ra!';
            alert(message);
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedProduct) return;
        setFormLoading(true);

        try {
            await productsService.delete(selectedProduct.id);
            setIsDeleteOpen(false);
            loadProducts();
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('Có lỗi xảy ra!');
        } finally {
            setFormLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    };

    const columns = [
        {
            key: 'id',
            header: 'ID',
            width: '60px',
        },
        {
            key: 'name',
            header: 'Sản phẩm',
            render: (item: Product) => (
                <div className="flex items-center gap-3">
                    {item.image ? (
                        <img
                            src={item.image}
                            alt={item.name}
                            className="w-12 h-12 rounded-xl object-cover bg-gray-100"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                            <Package className="w-6 h-6 text-violet-600" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                            {item.name}
                        </p>
                        <p className="text-sm text-gray-500">{item.category?.name}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'price',
            header: 'Giá bán',
            render: (item: Product) => (
                <span className="font-semibold text-violet-600">{formatCurrency(item.price)}</span>
            ),
        },
        {
            key: 'quantity',
            header: 'Tồn kho',
            render: (item: Product) => (
                <span className={`font-medium ${item.quantity <= 10 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                    {item.quantity}
                </span>
            ),
        },
        {
            key: 'soldOut',
            header: 'Đã bán',
            render: (item: Product) => <span className="text-green-600 font-medium">{item.soldOut}</span>,
        },
        {
            key: 'rating',
            header: 'Đánh giá',
            render: (item: Product) => (
                <div className="flex items-center gap-1">
                    <span className="text-yellow-500">★</span>
                    <span>{item.averageScore?.toFixed(1) || '0.0'}</span>
                    <span className="text-gray-400">({item.ratingCount})</span>
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            render: (item: Product) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); openEditModal(item); }}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-600"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); openDeleteModal(item); }}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="min-h-screen">
            <AdminHeader title="Sản phẩm" subtitle={`${totalCount} sản phẩm`} />

            <div className="p-6 space-y-6">
                {/* Toolbar */}
                <div className="flex flex-col lg:flex-row gap-4 justify-between">
                    <div className="flex flex-wrap gap-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm kiếm..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="pl-10 pr-4 py-2.5 w-64 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 outline-none"
                            />
                        </div>
                        {/* Category Filter */}
                        <select
                            value={categoryFilter || ''}
                            onChange={(e) => setCategoryFilter(e.target.value ? Number(e.target.value) : undefined)}
                            className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800"
                        >
                            <option value="">Tất cả danh mục</option>
                            {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                        {/* Brand Filter */}
                        <select
                            value={brandFilter || ''}
                            onChange={(e) => setBrandFilter(e.target.value ? Number(e.target.value) : undefined)}
                            className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800"
                        >
                            <option value="">Tất cả thương hiệu</option>
                            {brands.map((br) => (
                                <option key={br.id} value={br.id}>{br.name}</option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Thêm sản phẩm
                    </button>
                </div>

                {/* Table */}
                <DataTable
                    columns={columns}
                    data={products}
                    loading={loading}
                    page={page}
                    pageSize={10}
                    totalCount={totalCount}
                    onPageChange={setPage}
                    keyExtractor={(item) => item.id}
                    emptyMessage="Chưa có sản phẩm nào"
                />
            </div>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={selectedProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}
                size="lg"
                footer={
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">
                            Hủy
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={formLoading || !formData.name || !formData.price}
                            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium disabled:opacity-50 flex items-center gap-2"
                        >
                            {formLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            {selectedProduct ? 'Cập nhật' : 'Tạo mới'}
                        </button>
                    </div>
                }
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">Tên sản phẩm *</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => {
                                    const name = e.target.value;
                                    setFormData({
                                        ...formData,
                                        name,
                                        slug: generateSlug(name)
                                    });
                                }}
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 outline-none"
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">Slug *</label>
                            <input
                                type="text"
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 outline-none"
                                placeholder="slug-san-pham"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Giá bán *</label>
                            <input
                                type="number"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Giá vốn</label>
                            <input
                                type="number"
                                value={formData.capitalPrice}
                                onChange={(e) => setFormData({ ...formData, capitalPrice: Number(e.target.value) })}
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Số lượng</label>
                            <input
                                type="number"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Hình ảnh sản phẩm</label>
                            <ImageUpload
                                value={formData.image}
                                onChange={(url) => setFormData({ ...formData, image: url })}
                                type="product"
                                placeholder="Upload ảnh sản phẩm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Danh mục</label>
                            <select
                                value={formData.categoryId}
                                onChange={(e) => setFormData({ ...formData, categoryId: Number(e.target.value) })}
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800"
                            >
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Thương hiệu</label>
                            <select
                                value={formData.brandId}
                                onChange={(e) => setFormData({ ...formData, brandId: Number(e.target.value) })}
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800"
                            >
                                {brands.map((br) => (
                                    <option key={br.id} value={br.id}>{br.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">Mô tả</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 focus:ring-2 focus:ring-violet-500 outline-none resize-none"
                                rows={3}
                            />
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Delete Modal */}
            <ConfirmModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onConfirm={handleDelete}
                title="Xóa sản phẩm"
                message={`Bạn có chắc chắn muốn xóa "${selectedProduct?.name}"?`}
                confirmText="Xóa"
                loading={formLoading}
            />
        </div>
    );
}
