"use client";

import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { NextPage } from 'next';

// Use dynamic import with ssr disabled to avoid server component issues
const HomeContent = dynamic(() => import('@/components/HomeContent'), {
  ssr: false,
  loading: () => <div>Loading...</div>
});

const Home: NextPage = () => {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
          Welcome to Agentda
        </h1>
        <p className="text-xl mb-8 text-gray-700 dark:text-gray-300">
          AI-powered meeting management platform that helps you run more effective meetings
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/auth/login"
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200"
          >
            Get Started
          </Link>
          <Link
            href="/about"
            className="border border-blue-600 text-blue-600 px-6 py-2 rounded-md hover:bg-blue-600 hover:text-white transition-colors duration-200"
          >
            Learn More
          </Link>
        </div>
      </div>
      <HomeContent />
    </div>
  );
}

export default Home; 