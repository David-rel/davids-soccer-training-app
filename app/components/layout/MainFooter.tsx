export default function MainFooter() {
  return (
    <footer className="bg-linear-to-r from-emerald-700 to-emerald-800 text-white py-8 px-6">
      <div className="container mx-auto text-center">
        <div className="flex justify-center mb-4">
          <img
            src="/logo.jpeg"
            alt="David’s Soccer Training Logo"
            className="h-12 w-auto"
          />
        </div>
        <p className="text-emerald-100 mb-2">
          © 2025 David’s Soccer Training. All rights reserved.
        </p>
        <p className="text-emerald-200 text-sm">
          Private soccer training in Gilbert and Mesa for ages 8–16.
        </p>
      </div>
    </footer>
  );
}
