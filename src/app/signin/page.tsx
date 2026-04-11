'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/signin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (data.success) {
                router.push('/dashboard');
            } else {
                setError(data.message || 'Invalid email or password');
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-white dark:bg-black font-sans">
            {/* Left Panel - Visual / Brand (Hidden on Mobile) */}
            <div className="hidden lg:flex lg:w-1/2 bg-zinc-950 flex-col justify-between p-12 relative overflow-hidden">
                {/* Abstract Background Element (CSS representation of the 3D shape) */}
                <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800/40 via-zinc-950 to-zinc-950 pointer-events-none"></div>

                <div className="relative z-10">
                    <Link href="/" className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                        CodeAtlas
                    </Link>
                </div>

                <div className="relative z-10 max-w-md">
                    <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
                        Unify your coding identity in one powerful dashboard.
                    </h2>
                    <p className="text-lg text-zinc-400">
                        "Code is like humor. When you have to explain it, it’s bad." — Cory House
                    </p>
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-left">
                        <h2 className="text-3xl font-bold tracking-tight text-black dark:text-white">Welcome back</h2>
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                            Please enter your details to sign in.
                        </p>
                    </div>

                    <div className="mt-8 space-y-6">
                        {/* Google OAuth Button */}
                        <button
                            type="button"
                            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-sm text-sm font-medium text-black dark:text-white bg-white dark:bg-black hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            Log in with Google
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white dark:bg-black text-zinc-500">Or continue with email</span>
                            </div>
                        </div>

                        <form className="space-y-5" onSubmit={handleSubmit}>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email address</label>
                                <input
                                    name="email"
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black px-4 py-2.5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-colors"
                                    placeholder="you@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Password</label>
                                <input
                                    name="password"
                                    type="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-black px-4 py-2.5 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-colors"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 rounded border-zinc-300 text-black focus:ring-black" />
                                    <label htmlFor="remember-me" className="ml-2 block text-sm text-zinc-600 dark:text-zinc-400">Remember me</label>
                                </div>
                                <div className="text-sm">
                                    <a href="#" className="font-medium text-black dark:text-white hover:underline">Forgot password?</a>
                                </div>
                            </div>

                            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-black hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Signing in...' : 'Log in'}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
                            Don't have an account?{' '}
                            <Link href="/signup" className="font-semibold text-black dark:text-white hover:underline">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}