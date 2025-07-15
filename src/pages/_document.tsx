import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* TropicTalk Theme Fonts */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Special+Elite&family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap"
        />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        
        {/* Meta tags for better font rendering */}
        <meta name="color-scheme" content="dark light" />
        <meta name="theme-color" content="#ff6b9d" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}