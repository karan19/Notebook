"use client";

import { Authenticator, useTheme, View, Text, Image, useAuthenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { useEffect } from 'react';

const components = {
    Header() {
        return (
            <View textAlign="center" padding="large">
                <div className="flex flex-col items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-2xl">N</div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Notebook</h1>
                    <p className="text-gray-500 text-sm">Your professional writing space, secured.</p>
                </div>
            </View>
        );
    },
};

const formFields = {
    signIn: {
        username: {
            placeholder: 'Enter your email',
        },
    },
    signUp: {
        email: {
            order: 1
        },
        password: {
            order: 2
        },
        confirm_password: {
            order: 3
        }
    },
};

export function AuthWrapper({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-white">
            {/* Left Panel: Branding & Visuals (Desktop Only) */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#0A0B14]">
                {/* Background Gradient & Blur Orbs */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#1E293B] via-[#0F172A] to-[#020617]" />
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse delay-700" />

                {/* Glassmorphism Content */}
                <div className="relative z-10 w-full flex flex-col items-center justify-center p-12 text-center">
                    <div className="group relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
                        <div className="relative w-24 h-24 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl flex items-center justify-center mb-8 shadow-2xl overflow-hidden self-center mx-auto">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                            <span className="text-4xl font-black text-white tracking-tighter">N</span>
                        </div>
                    </div>

                    <h2 className="text-4xl font-bold text-white mb-6 tracking-tight">
                        Notebook <span className="text-blue-400">Pro</span>
                    </h2>
                    <p className="text-lg text-slate-400 max-w-md leading-relaxed">
                        Refine your thoughts in a premium, minimalist space designed for professional clarity.
                    </p>

                    {/* Decorative Elements */}
                    <div className="absolute bottom-12 left-12 right-12 flex justify-between items-center text-[10px] font-bold text-slate-500 tracking-[0.2em] uppercase">
                        <span>Encrypted Sync</span>
                        <div className="flex gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                            <span>System Active</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel: Interaction Area */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative">
                {/* Mobile Identity (Hidden on Desktop) */}
                <div className="lg:hidden absolute top-12 left-0 right-0 flex flex-col items-center">
                    <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-white font-bold text-xl mb-4">N</div>
                    <h1 className="text-xl font-bold">Notebook</h1>
                </div>

                <div className="w-full max-w-md">
                    <Authenticator
                        variation="modal"
                        components={components}
                        formFields={formFields}
                    >
                        {({ signOut, user }) => (
                            <main className="w-full h-full">
                                {children}
                            </main>
                        )}
                    </Authenticator>
                </div>
            </div>

            <style jsx global>{`
            [data-amplify-authenticator] {
                --amplify-colors-brand-primary-10: #4F46E5;
                --amplify-colors-brand-primary-80: #4F46E5;
                --amplify-colors-brand-primary-90: #4338CA;
                --amplify-colors-brand-primary-100: #3730A3;
                
                --amplify-components-button-primary-background-color: transparent;
                --amplify-components-button-primary-border-color: transparent;
                --amplify-components-button-primary-color: white;
                
                --amplify-components-fieldcontrol-focus-border-color: #4F46E5;
                --amplify-components-fieldcontrol-focus-box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
                --amplify-components-tabs-item-active-border-color: #4F46E5;
                --amplify-components-tabs-item-active-color: #4F46E5;
                
                --amplify-components-authenticator-router-box-shadow: none;
                --amplify-components-authenticator-router-border-width: 0;
                --amplify-radii-medium: 1rem;
                --amplify-radii-large: 1.25rem;
            }

            /* Custom Gradient for Primary Button */
            .amplify-button[data-variation='primary'] {
                background: linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%) !important;
                padding-top: 0.875rem !important;
                padding-bottom: 0.875rem !important;
                font-weight: 700 !important;
                border: none !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            }

            .amplify-button[data-variation='primary']:hover {
                transform: translateY(-1px);
                box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.4);
                filter: brightness(1.1);
            }

            .amplify-tabs {
                border-bottom: 2px solid #F1F5F9;
                margin-bottom: 2rem;
            }

            .amplify-tabs__item--active {
                border-bottom-width: 2px;
            }

            .amplify-heading {
                font-weight: 800;
                letter-spacing: -0.02em;
            }

            .amplify-input {
                background-color: #F8FAFC;
                border-color: #E2E8F0;
            }

            .amplify-input:focus {
                background-color: white;
            }
        `}</style>
        </div>
    );
}
