import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg">
                <span className="text-white font-display font-bold">P</span>
              </div>
              <span className="font-display font-bold text-xl text-slate-900">ProjectX</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="text-slate-700 hover:text-slate-900 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold rounded-lg hover:shadow-lg transition-all"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-display font-bold text-slate-900 leading-tight">
              Welcome to
              <span className="block bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent">
                ProjectX
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 max-w-2xl mx-auto">
              A modern, secure, and professional authentication platform built for tomorrow
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white text-lg font-semibold rounded-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              Create Account
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 border-2 border-slate-200 hover:border-primary-600 text-slate-900 text-lg font-semibold rounded-lg transition-all hover:bg-slate-50"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl font-display font-bold text-center text-slate-900 mb-12">
          Why Choose ProjectX?
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: '🔒',
              title: 'Secure',
              description: 'Enterprise-grade security with encrypted passwords and JWT tokens'
            },
            {
              icon: '⚡',
              title: 'Fast',
              description: 'Lightning-fast authentication with optimized database queries'
            },
            {
              icon: '🎨',
              title: 'Beautiful',
              description: 'Modern, responsive UI built with Tailwind CSS'
            },
            {
              icon: '📱',
              title: 'Mobile First',
              description: 'Fully responsive design works perfectly on all devices'
            },
            {
              icon: '🔧',
              title: 'Easy to Use',
              description: 'Simple and intuitive interface for better user experience'
            },
            {
              icon: '🚀',
              title: 'Scalable',
              description: 'Built to handle growth with modern architecture'
            },
          ].map((feature, idx) => (
            <div
              key={idx}
              className="bg-white rounded-xl p-8 shadow-base hover:shadow-lg transition-all group"
            >
              <div className="text-4xl mb-4 group-hover:scale-125 transition-transform">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">{feature.title}</h3>
              <p className="text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg">
                <span className="text-white font-display font-bold">P</span>
              </div>
              <span className="font-display font-bold text-white">ProjectX</span>
            </div>
            <p className="text-sm">
              © 2026 ProjectX. All rights reserved. | 
              <a href="#" className="hover:text-white ml-2">Privacy Policy</a> | 
              <a href="#" className="hover:text-white ml-2">Terms of Service</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
