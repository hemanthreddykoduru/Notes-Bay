import React, { useState } from 'react';
import { Share2, Link as LinkIcon, Facebook, Twitter } from 'lucide-react';

const SocialShare = ({ title, url }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(title);

    const shareLinks = [
        {
            name: 'WhatsApp',
            icon: <span className="font-bold text-green-500">WA</span>, // Using text for simplicity or replace with specific icon if available
            href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
            color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
        },
        {
            name: 'Twitter',
            icon: <Twitter className="w-5 h-5" />,
            href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
            color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-400',
        },
        {
            name: 'Facebook',
            icon: <Facebook className="w-5 h-5" />,
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
            color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
        }
    ];

    return (
        <div className="flex items-center space-x-3 mt-4">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                <Share2 className="w-4 h-4 mr-1" />
                Share:
            </span>
            {shareLinks.map((link) => (
                <a
                    key={link.name}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-2 rounded-full transition-colors ${link.color} hover:opacity-80`}
                    title={`Share on ${link.name}`}
                >
                    {link.icon}
                </a>
            ))}
            <button
                onClick={handleCopy}
                className={`p-2 rounded-full transition-colors ${copied
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                title="Copy Link"
            >
                <LinkIcon className="w-5 h-5" />
            </button>
            {copied && <span className="text-xs text-green-600 animate-fade-in-out">Copied!</span>}
        </div>
    );
};

export default SocialShare;
