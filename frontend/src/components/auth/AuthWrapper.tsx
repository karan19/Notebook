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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
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

            <style jsx global>{`
            [data-amplify-authenticator] {
                --amplify-colors-brand-primary-10: black;
                --amplify-colors-brand-primary-80: black;
                --amplify-colors-brand-primary-90: #333;
                --amplify-colors-brand-primary-100: #444;
                --amplify-components-button-primary-background-color: black;
                --amplify-components-button-primary-hover-background-color: #222;
                --amplify-components-fieldcontrol-focus-border-color: black;
                --amplify-components-tabs-item-active-border-color: black;
                --amplify-components-tabs-item-active-color: black;
                --amplify-components-authenticator-router-box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
                --amplify-components-authenticator-router-border-width: 0;
                --amplify-radii-medium: 1.5rem;
                --amplify-radii-large: 2rem;
            }
            .amplify-tabs {
                border-bottom: 1px solid #f3f4f6;
                margin-bottom: 1rem;
            }
            .amplify-button[data-variation='primary'] {
                padding-top: 1rem;
                padding-bottom: 1rem;
                font-weight: 600;
                letter-spacing: -0.01em;
            }
        `}</style>
        </div>
    );
}
