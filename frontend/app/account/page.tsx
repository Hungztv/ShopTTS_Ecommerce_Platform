'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usersService, UpdateUserDto } from '@/lib/services/admin/users-service';
import { AppUser } from '@/lib/services/admin/dashboard-service';
import ImageUpload from '@/components/admin/ImageUpload';
import { Camera, Save, Loader2, Mail, Phone, MapPin, Calendar, Briefcase } from 'lucide-react';

export default function AccountPage() {
    const { user: authUser } = useAuth();
    const [profile, setProfile] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        address: '',
        dateOfBirth: '',
        avatar: '',
        occupation: '',
    });

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const data = await usersService.getMe();
            if (data) {
                setProfile(data);
                setFormData({
                    fullName: data.fullName || '',
                    phoneNumber: data.phoneNumber || '',
                    address: data.address || '',
                    dateOfBirth: data.dateOfBirth ? data.dateOfBirth.split('T')[0] : '',
                    avatar: data.avatar || '',
                    occupation: data.occupation || '',
                });
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;

        setSaving(true);
        setMessage(null);

        try {
            const updateData: UpdateUserDto = {
                fullName: formData.fullName,
                phoneNumber: formData.phoneNumber,
                address: formData.address,
                dateOfBirth: formData.dateOfBirth || undefined,
                avatar: formData.avatar,
                occupation: formData.occupation,
            };

            await usersService.updateMe(updateData);
            setMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });
        } catch (error: unknown) {
            const apiError = error as { response?: { data?: { message?: string } } };
            setMessage({
                type: 'error',
                text: apiError.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại!'
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Profile Header Card */}
            <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-6 text-white relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                        backgroundImage: 'radial-gradient(circle at 25px 25px, white 2px, transparent 0)',
                        backgroundSize: '50px 50px'
                    }}></div>
                </div>

                <div className="relative flex flex-col sm:flex-row items-center gap-6">
                    {/* Avatar */}
                    <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-4 border-white/30">
                            {formData.avatar ? (
                                <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-4xl font-bold">
                                    {formData.fullName?.charAt(0)?.toUpperCase() || authUser?.email?.charAt(0)?.toUpperCase()}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="text-center sm:text-left">
                        <h2 className="text-2xl font-bold">{formData.fullName || 'Chưa cập nhật'}</h2>
                        <p className="text-violet-200">{authUser?.email}</p>
                        {formData.occupation && (
                            <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-white/20 rounded-full text-sm">
                                <Briefcase className="w-3.5 h-3.5" />
                                {formData.occupation}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-6">Thông tin cá nhân</h3>

                {message && (
                    <div className={`mb-6 p-4 rounded-xl ${message.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Avatar Upload */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            <Camera className="w-4 h-4 inline mr-1.5" />
                            Ảnh đại diện
                        </label>
                        <ImageUpload
                            value={formData.avatar}
                            onChange={(url) => setFormData({ ...formData, avatar: url })}
                            type="avatar"
                            placeholder="Upload ảnh đại diện"
                        />
                    </div>

                    {/* Name & Phone Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Họ và tên
                            </label>
                            <input
                                type="text"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all"
                                placeholder="Nhập họ và tên"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                <Phone className="w-4 h-4 inline mr-1.5" />
                                Số điện thoại
                            </label>
                            <input
                                type="tel"
                                value={formData.phoneNumber}
                                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all"
                                placeholder="0901234567"
                            />
                        </div>
                    </div>

                    {/* DOB & Occupation Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                <Calendar className="w-4 h-4 inline mr-1.5" />
                                Ngày sinh
                            </label>
                            <input
                                type="date"
                                value={formData.dateOfBirth}
                                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                <Briefcase className="w-4 h-4 inline mr-1.5" />
                                Nghề nghiệp
                            </label>
                            <input
                                type="text"
                                value={formData.occupation}
                                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all"
                                placeholder="VD: Kỹ sư phần mềm"
                            />
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            <MapPin className="w-4 h-4 inline mr-1.5" />
                            Địa chỉ
                        </label>
                        <textarea
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all resize-none"
                            rows={3}
                            placeholder="Nhập địa chỉ giao hàng"
                        />
                    </div>

                    {/* Email (Read-only) */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            <Mail className="w-4 h-4 inline mr-1.5" />
                            Email
                        </label>
                        <input
                            type="email"
                            value={authUser?.email || ''}
                            disabled
                            className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
                        />
                        <p className="text-xs text-slate-400 mt-1">Email không thể thay đổi</p>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Đang lưu...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Lưu thay đổi
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
