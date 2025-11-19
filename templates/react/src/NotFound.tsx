function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0B0B1D] px-4 py-16">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex items-center gap-3">
          <img
            src="https://www.coderocket.app/logo-alternate.png"
            alt="CodeRocket"
            className="h-12 w-12"
          />
          <h1 className="text-[#FFFFFF] text-5xl font-bold">CodeRocket.app</h1>
        </div>
        <h2 className="text-[#FFFFFF] text-4xl font-bold">404</h2>
        <p className="text-[#FFFFFF] text-xl">Page not found</p>
        <a
          href="/"
          className="text-[#6366F1] hover:text-[#818CF8] text-lg underline transition-colors"
        >
          Go back home
        </a>
      </div>
    </div>
  );
}

export default NotFound;
