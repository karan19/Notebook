"use client";

import { Authenticator, useTheme, View, Text, Image, useAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { Notebook } from 'lucide-react';
import { motion } from 'motion/react';

const components = {
    Header() {
        return (
            <div className="flex flex-col items-center gap-4 mb-8 lg:mb-10 text-center">
                <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-xl hover:scale-105 transition-transform duration-300">N</div>
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Welcome back</h1>
                    <p className="text-gray-400 text-sm font-medium">Continue your professional writing journey</p>
                </div>
            </div>
        );
    },
};

const formFields = {
    signIn: {
        username: {
            placeholder: 'alex@example.com',
            label: 'Email Address'
        },
        password: {
            placeholder: '••••••••',
            label: 'Password'
        }
    },
};

export function AuthWrapper({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen flex bg-white overflow-hidden">
            {/* Left: Branding Panel (Desktop Only) */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-blue-700 via-purple-700 to-indigo-900 flex-col items-center justify-center p-12 text-white">
                {/* Ambient Blur Orbs */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[120px] animate-pulse"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                    className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-400/20 rounded-full blur-[120px] animate-pulse [animation-delay:2s]"
                />

                <div className="relative z-10 max-w-lg w-full">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
                        className="space-y-4 text-center lg:text-left"
                    >
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center border border-white/20 shadow-2xl mx-auto lg:mx-0"
                        >
                            <Notebook className="w-6 h-6 text-white" />
                        </motion.div>
                        <h2 className="text-5xl font-extrabold tracking-tight leading-tight">
                            Elevate your <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200">digital notes.</span>
                        </h2>
                        <p className="text-blue-100/70 text-lg font-medium leading-relaxed">
                            A workspace designed for deep focus, structured clarity, and seamless cloud synchronization.
                        </p>
                    </motion.div>
                </div>

            </div>

            {/* Right: Interaction Area */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 bg-white relative">
                <div className="w-full max-w-md">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
                    >
                        <Authenticator
                            components={components}
                            formFields={formFields}
                            hideSignUp={true}
                        >
                            {({ signOut, user }) => (
                                <main className="w-full h-full">
                                    {children}
                                </main>
                            )}
                        </Authenticator>
                    </motion.div>
                </div>
            </div>

            <style jsx global>{`
            [data-amplify-authenticator] {
                --amplify-colors-brand-primary-10: oklch(0.5 0.2 260);
                --amplify-colors-brand-primary-80: oklch(0.5 0.2 260);
                --amplify-colors-brand-primary-90: oklch(0.4 0.2 260);
                --amplify-colors-brand-primary-100: oklch(0.3 0.2 260);
                --amplify-components-button-primary-background-color: linear-gradient(135deg, #2563eb, #7c3aed);
                --amplify-components-button-primary-hover-background-color: linear-gradient(135deg, #1d4ed8, #6d28d9);
                --amplify-components-fieldcontrol-focus-border-color: #3b82f6;
                --amplify-components-tabs-item-active-border-color: #2563eb;
                --amplify-components-tabs-item-active-color: #2563eb;
                --amplify-components-authenticator-router-box-shadow: none;
                --amplify-components-authenticator-router-border-width: 0;
                --amplify-radii-medium: 1.25rem;
                --amplify-radii-large: 1.5rem;
                --amplify-fonts-default-variable: 'Inter', sans-serif;
            }
            .amplify-tabs {
                border-bottom: 2px solid #f3f4f6;
                margin-bottom: 2.5rem;
            }
            .amplify-tabs__item {
                font-weight: 700 !important;
                font-size: 0.875rem !important;
                letter-spacing: -0.01em !important;
                color: #9ca3af !important;
                padding: 1rem 0 !important;
            }
            .amplify-tabs__item--active {
                color: #111827 !important;
                border-bottom-width: 2px !important;
            }
            .amplify-button[data-variation='primary'] {
                padding-top: 0.875rem !important;
                padding-bottom: 0.875rem !important;
                font-weight: 800 !important;
                letter-spacing: -0.01em !important;
                border: none !important;
                box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.25) !important;
                transition: all 0.3s ease !important;
                font-size: 0.95rem !important;
            }
            .amplify-button[data-variation='primary']:hover {
                transform: translateY(-1px) !important;
                box-shadow: 0 20px 35px -10px rgba(37, 99, 235, 0.35) !important;
            }
            .amplify-label {
                font-weight: 700 !important;
                color: #374151 !important;
                font-size: 0.85rem !important;
                margin-bottom: 0.5rem !important;
            }
            .amplify-input {
                background-color: #f9fafb !important;
                border: 1px solid #e5e7eb !important;
                padding: 0.75rem 1rem !important;
                font-weight: 500 !important;
            }
            .amplify-input:focus {
                background-color: white !important;
                border-color: #3b82f6 !important;
                box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1) !important;
            }
            [data-amplify-authenticator-forgotpassword] {
                display: none !important;
            }
        `}</style>
        </div>
    );
}
