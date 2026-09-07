'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Search, Package, Filter, Store, ShieldAlert, Info, ExternalLink } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import DataTable from '@/components/admin/DataTable';
import Modal, { ConfirmModal } from '@/components/admin/Modal';
import ImageUpload from '@/components/admin/ImageUpload';
import { productsService, CreateProductDto } from '@/lib/services/admin/products-service';
import { categoriesService } from '@/lib/services/admin/categories-service';
import { brandsService } from '@/lib/services/admin/brands-service';
import { Product, Category, Brand } from '@/lib/services/admin/dashboard-service';
import Link from 'next/link';

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
                            className="w-12 h-12 rounded-xl object-cover bg-gray-100 border border-gray-200 dark:border-gray-700"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                            <Package className="w-6 h-6 text-violet-600" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">
                            {item.name}
                        </p>
                        <span className="text-xs text-gray-500">{item.category?.name || 'Danh mục khác'}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'shop',
            header: 'Cửa hàng (Shop)',
            render: (item: Product) => {
                const shopName = item.shopName || `Shop #${item.shopId || '—'}`;
                return (
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-200 dark:border-emerald-800">
                            <Store className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white text-xs truncate max-w-[150px]">
                                {shopName}
                            </p>
                            {item.shopSlug ? (
                                <Link
                                    href={`/shops/${item.shopSlug}`}
                                    target="_blank"
                                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5"
                                >
                                    Xem gian hàng <ExternalLink className="w-2.5 h-2.5" />
                                </Link>
                            ) : (
                                <span className="text-[10px] text-gray-400">ID Shop: {item.shopId || 'Hệ thống'}</span>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'price',
            header: 'Giá bán',
            render: (item: Product) => (
                <span className="font-extrabold text-violet-600 dark:text-violet-400">{formatCurrency(item.price)}</span>
            ),
        },
        {
            key: 'quantity',
            header: 'Tồn kho',
            render: (item: Product) => (
                <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${item.quantity <= 10 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'}`}>
                    {item.quantity} sp
                </span>
            ),
        },
        {
            key: 'soldOut',
            header: 'Đã bán',
            render: (item: Product) => <span className="text-emerald-600 font-bold text-xs">{item.soldOut} sp</span>,
        },
        {
            key: 'rating',
            header: 'Đánh giá',
            render: (item: Product) => (
                <div className="flex items-center gap-1 font-semibold text-xs text-amber-500">
                    <span>★</span>
                    <span>{item.averageScore?.toFixed(1) || '5.0'}</span>
                    <span className="text-gray-400 text-[11px]">({item.ratingCount || 0})</span>
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Kiểm duyệt / Thao tác',
            render: (item: Product) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); openEditModal(item); }}
                        className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 transition-colors"
                        title="Chỉnh sửa sản phẩm"
                    >
                        <Pencil className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); openDeleteModal(item); }}
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 transition-colors"
                        title="Gỡ / Xóa sản phẩm vi phạm"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="min-h-screen pb-12">
            <AdminHeader title="Quản Lý Sản Phẩm Toàn Hệ Thống" subtitle={`Tổng số ${totalCount} sản phẩm từ các Cửa Hàng / Seller trên sàn`} />

            <div className="p-6 space-y-6">
                {/* Information Banner for Admin */}
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-4 rounded-2xl flex items-start gap-3 text-amber-800 dark:text-amber-300 text-xs sm:text-sm">
                    <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                        <b>Lưu ý dành cho Quản trị viên:</b> Tất cả các sản phẩm trên hệ thống được đăng tải và quản lý trực tiếp bởi các <b>Cửa hàng (Shop / Seller)</b> thông qua kênh <i>Seller Center</i>. Quản trị viên thực hiện vai trò <b>giám sát, kiểm duyệt nội dung, sửa hoặc gỡ bỏ sản phẩm</b> khi có vi phạm quy định sàn.
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col lg:flex-row gap-4 justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex flex-wrap gap-3 flex-1">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[240px]">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Tìm theo tên sản phẩm hoặc tên Shop..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                className="pl-10 pr-4 py-2.5 w-full border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                            />
                        </div>
                        {/* Category Filter */}
                        <select
                            value={categoryFilter || ''}
                            onChange={(e) => setCategoryFilter(e.target.value ? Number(e.target.value) : undefined)}
                            className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm outline-none"
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
                            className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm outline-none"
                        >
                            <option value="">Tất cả thương hiệu</option>
                            {brands.map((br) => (
                                <option key={br.id} value={br.id}>{br.name}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={openCreateModal}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold text-xs transition-colors shadow-md shadow-violet-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        Thêm sản phẩm mẫu
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
                    emptyMessage="Chưa có sản phẩm nào trên hệ thống"
                />
            </div>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={selectedProduct ? `Kiểm duyệt / Sửa sản phẩm: "${selectedProduct.name}"` : 'Thêm sản phẩm mẫu mới'}
                size="lg"
                footer={
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-sm font-medium">
                            Hủy
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={formLoading || !formData.name || !formData.price}
                            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
                        >
                            {formLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            {selectedProduct ? 'Cập nhật sản phẩm' : 'Tạo mới'}
                        </button>
                    </div>
                }
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {selectedProduct && (
                        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                            <span className="flex items-center gap-2 font-bold">
                                <Store className="w-4 h-4" /> Cửa hàng sở hữu: {selectedProduct.shopName || `Shop #${selectedProduct.shopId || '—'}`}
                            </span>
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400">ID Sản phẩm: #{selectedProduct.id}</span>
                        </div>
                    )}

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
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-violet-500 outline-none text-sm"
                                required
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-1">Slug *</label>
                            <input
                                type="text"
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-violet-500 outline-none text-sm"
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
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-violet-500 outline-none text-sm"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Giá vốn</label>
                            <input
                                type="number"
                                value={formData.capitalPrice}
                                onChange={(e) => setFormData({ ...formData, capitalPrice: Number(e.target.value) })}
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-violet-500 outline-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Số lượng tồn kho</label>
                            <input
                                type="number"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-violet-500 outline-none text-sm"
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
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm"
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
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-sm"
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
                                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 focus:ring-2 focus:ring-violet-500 outline-none text-sm resize-none"
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
                title="Gỡ / Xóa sản phẩm"
                message={`Bạn có chắc chắn muốn gỡ sản phẩm "${selectedProduct?.name}" khỏi hệ thống?`}
                confirmText="Gỡ bỏ"
                loading={formLoading}
            />
        </div>
    );
}
