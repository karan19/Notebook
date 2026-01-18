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
        GraphQL: {
            endpoint: process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT!,
            region: process.env.NEXT_PUBLIC_AWS_REGION!,
            defaultAuthMode: 'userPool'
        }
    }
}, { ssr: true });

export default function ConfigureAmplifyClientSide() {
    return null;
}
