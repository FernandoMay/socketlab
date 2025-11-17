import { Html, Head, Main, NextScript } from 'next/document';

interface DocumentProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

const Document: React.FC<DocumentProps> = ({ title, description, image, url }) => {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title || 'Socket Programming Lab 1'}</title>
        <meta name="description" content={description || 'Advanced socket programming implementation with real-time file transfer'} />
        <meta name="keywords" content="socket programming, file transfer, nextjs, react, network programming" />
        <meta property="og:title" content={title || 'Socket Programming Lab 1'} />
        <meta property="og:description" content={description || 'Advanced socket programming implementation with real-time file transfer'} />
        <meta property="og:image" content={image || '/og-image.jpg'} />
        <meta property="og:url" content={url || 'https://socket-programming-lab1.vercel.app'} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title || 'Socket Programming Lab 1'} />
        <meta name="twitter:description" content={description || 'Advanced socket programming implementation with real-time file transfer'} />
        <meta name="twitter:image" content={image || '/og-image.jpg'} />
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
};

export default Document;