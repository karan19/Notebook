"use client";

import { Amplify } from 'aws-amplify';

// Rebuild for env vars
Amplify.configure({
    Auth: {
        Cognito: {
            userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID!,
            userPoolClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID!,
        }
    },
    API: {
        REST: {
            NotebookApi: {
                endpoint: process.env.NEXT_PUBLIC_REST_API_ENDPOINT!,
                region: process.env.NEXT_PUBLIC_AWS_REGION!,
            }
        },
    }
}, { ssr: true });

export default function ConfigureAmplifyClientSide() {
    return null;
}
