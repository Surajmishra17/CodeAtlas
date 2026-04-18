'use client';

import { useEffect, useState } from 'react';

export default function StarBackground() {
    const [stars, setStars] = useState<{ id: number; left: string; top: string; delay: string; duration: string; size: string }[]>([]);

    useEffect(() => {
        // 1. Increased density to 200 stars
        const generateStars = () => {
            const newStars = Array.from({ length: 1000 }).map((_, i) => ({
                id: i,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                // 2. Negative delay ensures the stars are already moving when the page loads
                delay: `-${Math.random() * 30}s`,
                // Randomize how fast they drift (between 15s and 35s)
                duration: `${Math.random() * 20 + 15}s`,
                // Mix of tiny dots and slightly larger ones
                size: `${Math.random() * 2 + 1}px`,
            }));
            setStars(newStars);
        };

        generateStars();
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {/* Custom keyframes injected safely into the component */}
            <style>
                {`
          @keyframes drift {
            0% { 
              transform: translateY(0px) translateX(0px); 
              opacity: 0; 
            }
            15% { 
              opacity: 1; 
            }
            85% { 
              opacity: 1; 
            }
            100% { 
              transform: translateY(-200px) translateX(100px); 
              opacity: 0; 
            }
          }
        `}
            </style>

            {stars.map((star) => (
                <div
                    key={star.id}
                    className="absolute"
                    style={{
                        left: star.left,
                        top: star.top,
                        // 3. Apply the drift animation
                        animation: `drift ${star.duration} linear infinite`,
                        animationDelay: star.delay,
                    }}
                >
                    {/* The inner div handles the twinkling (pulse) and colors */}
                    <div
                        className="rounded-full bg-zinc-800 dark:bg-zinc-200 animate-pulse opacity-30 dark:opacity-60"
                        style={{
                            width: star.size,
                            height: star.size,
                        }}
                    />
                </div>
            ))}
        </div>
    );
}