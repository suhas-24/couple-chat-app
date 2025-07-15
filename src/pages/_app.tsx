import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { AuthProvider } from '@/context/AuthContext'
import { ChatProvider } from '@/context/ChatContext'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { useEffect, useState } from 'react'
import Head from 'next/head'

export default function App({ Component, pageProps }: AppProps) {
  // Get Google Client ID from environment
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

  return (
    <>
      <Head>
        {/* TropicTalk Theme */}
        <title>TropicTalk - Couple Chat App</title>
        <meta name="description" content="Beautiful tropical-themed chat app for couples" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Performance optimizations */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Viewport optimization */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
      </Head>

      <GoogleOAuthProvider clientId={googleClientId}>
        <AuthProvider>
          <ChatProvider>
            <Component {...pageProps} />
          </ChatProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    </>
  )
}
