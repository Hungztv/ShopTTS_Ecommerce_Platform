'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Send,
    Loader2,
    MapPin,
    Phone,
    Mail,
    Clock,
    CheckCircle,
    AlertCircle,
    MessageSquare
} from 'lucide-react';
import { contactService } from '@/lib/services/contact-service';

// Validation schema
const contactSchema = z.object({
    name: z.string().min(1, 'Vui lòng nhập họ tên'),
    email: z.string().min(1, 'Vui lòng nhập email').email('Email không hợp lệ'),
    phone: z.string().optional().refine(
        (val) => !val || /^[0-9]{10,11}$/.test(val),
        'Số điện thoại không hợp lệ'
    ),
    subject: z.string().min(1, 'Vui lòng nhập tiêu đề'),
    message: z.string().min(10, 'Nội dung phải có ít nhất 10 ký tự'),
});

type ContactFormData = z.infer<typeof contactSchema>;

type ApiError = {
    response?: {
        data?: {
            message?: string;
        };
    };
};

export default function ContactPage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ContactFormData>({
        resolver: zodResolver(contactSchema),
    });

    const onSubmit = async (data: ContactFormData) => {
        setIsSubmitting(true);
        setSubmitStatus('idle');
        setErrorMessage('');

        try {
            const response = await contactService.create({
                name: data.name,
                email: data.email,
                phone: data.phone || undefined,
                subject: data.subject,
                message: data.message,
            });

            if (response.success) {
                setSubmitStatus('success');
                reset();
            } else {
                setSubmitStatus('error');
                setErrorMessage(response.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
            }
        } catch (error: unknown) {
            const apiError = error as ApiError;
            setSubmitStatus('error');
            setErrorMessage(apiError.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const shopInfo = {
        address: process.env.NEXT_PUBLIC_SHOP_ADDRESS || 'Phường Yên Nghĩa, quận Hà Đông, Hà Nội.',
        phone: process.env.NEXT_PUBLIC_SHOP_PHONE || '1900 1234 56',
        email: process.env.NEXT_PUBLIC_SHOP_EMAIL || 'support@shoptts.vn',
        hours: [
            { day: 'Thứ 2 - Thứ 6', time: '8:00 - 22:00' },
            { day: 'Thứ 7 - Chủ nhật', time: '9:00 - 21:00' },
        ],
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800">
            {/* Hero Section */}
            <section className="relative py-16 md:py-24 overflow-hidden">
                {/* Background decorations */}
                <div className="absolute inset-0 gradient-mesh opacity-50" />
                <div className="absolute top-20 left-10 w-72 h-72 bg-violet-300/30 rounded-full blur-3xl animate-blob" />
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-pink-300/20 rounded-full blur-3xl animate-blob" style={{ animationDelay: '2s' }} />

                <div className="relative max-w-7xl mx-auto px-4 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 text-violet-700 text-sm font-medium mb-6 animate-fade-in-down">
                        <MessageSquare className="w-4 h-4" />
                        Liên hệ với chúng tôi
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-800 dark:text-white mb-6 animate-fade-in-up">
                        Chúng tôi luôn sẵn sàng <br />
                        <span className="gradient-text">hỗ trợ bạn</span>
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto animate-fade-in-up stagger-2">
                        Có câu hỏi hoặc cần hỗ trợ? Đội ngũ của chúng tôi sẽ phản hồi trong thời gian sớm nhất.
                    </p>
                </div>
            </section>

            {/* Contact Content */}
            <section className="py-12 md:py-16">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
                        {/* Contact Form */}
                        <div className="glass-card rounded-3xl p-6 md:p-8 animate-fade-in-left">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Gửi tin nhắn</h2>

                            {/* Success/Error Alert */}
                            {submitStatus === 'success' && (
                                <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-emerald-800">Gửi thành công!</p>
                                        <p className="text-sm text-emerald-600">Chúng tôi sẽ liên hệ lại với bạn sớm nhất.</p>
                                    </div>
                                </div>
                            )}

                            {submitStatus === 'error' && (
                                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-semibold text-red-800">Có lỗi xảy ra!</p>
                                        <p className="text-sm text-red-600">{errorMessage}</p>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                                {/* Name */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Họ và tên <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        {...register('name')}
                                        className={`w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-slate-800 dark:text-white transition-all outline-none ${errors.name
                                            ? 'border-red-300 focus:border-red-400'
                                            : 'border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100'
                                            }`}
                                        placeholder="Nguyễn Văn A"
                                    />
                                    {errors.name && (
                                        <p className="mt-1.5 text-sm text-red-500">{errors.name.message}</p>
                                    )}
                                </div>

                                {/* Email & Phone */}
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Email <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            {...register('email')}
                                            className={`w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-slate-800 dark:text-white transition-all outline-none ${errors.email
                                                ? 'border-red-300 focus:border-red-400'
                                                : 'border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100'
                                                }`}
                                            placeholder="email@example.com"
                                        />
                                        {errors.email && (
                                            <p className="mt-1.5 text-sm text-red-500">{errors.email.message}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                            Số điện thoại
                                        </label>
                                        <input
                                            type="tel"
                                            {...register('phone')}
                                            className={`w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-slate-800 dark:text-white transition-all outline-none ${errors.phone
                                                ? 'border-red-300 focus:border-red-400'
                                                : 'border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100'
                                                }`}
                                            placeholder="0901234567"
                                        />
                                        {errors.phone && (
                                            <p className="mt-1.5 text-sm text-red-500">{errors.phone.message}</p>
                                        )}
                                    </div>
                                </div>

                                {/* Subject */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Tiêu đề <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        {...register('subject')}
                                        className={`w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-slate-800 dark:text-white transition-all outline-none ${errors.subject
                                            ? 'border-red-300 focus:border-red-400'
                                            : 'border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100'
                                            }`}
                                        placeholder="Hỏi về sản phẩm..."
                                    />
                                    {errors.subject && (
                                        <p className="mt-1.5 text-sm text-red-500">{errors.subject.message}</p>
                                    )}
                                </div>

                                {/* Message */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Nội dung <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        {...register('message')}
                                        rows={5}
                                        className={`w-full px-4 py-3 rounded-xl border-2 bg-white dark:bg-slate-800 dark:text-white transition-all outline-none resize-none ${errors.message
                                            ? 'border-red-300 focus:border-red-400'
                                            : 'border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100'
                                            }`}
                                        placeholder="Nhập nội dung tin nhắn của bạn..."
                                    />
                                    {errors.message && (
                                        <p className="mt-1.5 text-sm text-red-500">{errors.message.message}</p>
                                    )}
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full sm:w-auto btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Đang gửi...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" />
                                            Gửi tin nhắn
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Shop Info */}
                        <div className="space-y-6 animate-fade-in-right">
                            {/* Info Cards */}
                            <div className="glass-card rounded-3xl p-6 md:p-8">
                                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Thông tin liên hệ</h2>

                                <div className="space-y-5">
                                    {/* Address */}
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                            <MapPin className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-800 dark:text-white mb-1">Địa chỉ</h3>
                                            <p className="text-slate-600">{shopInfo.address}</p>
                                        </div>
                                    </div>

                                    {/* Phone */}
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
                                            <Phone className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-800 dark:text-white mb-1">Hotline</h3>
                                            <a
                                                href={`tel:${shopInfo.phone.replace(/\s/g, '')}`}
                                                className="text-violet-600 hover:text-violet-700 font-medium"
                                            >
                                                {shopInfo.phone}
                                            </a>
                                        </div>
                                    </div>

                                    {/* Email */}
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center flex-shrink-0">
                                            <Mail className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-800 dark:text-white mb-1">Email</h3>
                                            <a
                                                href={`mailto:${shopInfo.email}`}
                                                className="text-violet-600 hover:text-violet-700 font-medium"
                                            >
                                                {shopInfo.email}
                                            </a>
                                        </div>
                                    </div>

                                    {/* Hours */}
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                                            <Clock className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-800 mb-2">Giờ làm việc</h3>
                                            <div className="space-y-1">
                                                {shopInfo.hours.map((item, index) => (
                                                    <div key={index} className="flex justify-between text-sm">
                                                        <span className="text-slate-600">{item.day}</span>
                                                        <span className="font-medium text-slate-800">{item.time}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Map */}
                            <div className="glass-card rounded-3xl overflow-hidden">
                                <div className="aspect-video bg-slate-200 relative">
                                    <iframe
                                        src={process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED || "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3919.4946681007426!2d106.69885661541788!3d10.771594192323946!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31752f4670702e31%3A0xa5777fb3853f58a6!2zQuG6v24gTmjDoCBSb25n!5e0!3m2!1svi!2s!4v1635000000000!5m2!1svi!2s"}
                                        width="100%"
                                        height="100%"
                                        style={{ border: 0 }}
                                        allowFullScreen
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                        className="absolute inset-0"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
