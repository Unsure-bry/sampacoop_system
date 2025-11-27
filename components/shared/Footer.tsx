export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 h-16 bg-blue-600 text-white shadow-md z-30">
      <div className="container mx-auto px-4 h-full flex items-center justify-center">
        <p className="text-sm md:text-base">&copy; {new Date().getFullYear()} SAMPA COOP. All rights reserved.</p>
      </div>
    </footer>
  );
}