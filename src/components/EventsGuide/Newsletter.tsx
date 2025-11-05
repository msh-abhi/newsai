import React from 'react';
import Card from '../UI/Card';
import { Mail, Send } from 'lucide-react';

const Newsletter = () => {
  return (
    <section className="py-12 sm:py-16 lg:py-20" style={{ backgroundColor: '#FF00AA' }}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-transparent border-2 border-white/30 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-center mb-4 sm:mb-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Mail className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
              Stay Connected
            </h2>
            <p className="text-base sm:text-lg text-white/90 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed">
              Get the latest news, events, and resources for families with special needs in Miami-Dade County delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email address"
                className="flex-1 px-4 py-3 rounded-lg border border-white/50 bg-white/10 backdrop-blur-sm text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
              />
              <button className="px-4 sm:px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg">
                <Send className="h-4 w-4" />
                Subscribe
              </button>
            </div>
            <p className="text-sm text-white/70 mt-4">
              We respect your privacy. Unsubscribe at any time.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
