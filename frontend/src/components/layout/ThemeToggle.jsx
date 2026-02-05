import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <button
            className="theme-toggle"
            id="theme-toggle"
            title="Toggles light & dark"
            aria-label={isDark ? "System" : "Dark"}
            aria-live="polite"
            onClick={(e) => toggleTheme(e)}
        >
            <svg
                className="sun-and-moon"
                aria-hidden="true"
                width="24"
                height="24"
                viewBox="0 0 24 24"
            >
                <mask className="moon" id="moon-mask">
                    <rect x="0" y="0" width="100%" height="100%" fill="white" />
                    <circle cx="24" cy="10" r="6" fill="black" />
                </mask>
                <circle
                    className="sun"
                    cx="12"
                    cy="12"
                    r="6"
                    mask="url(#moon-mask)"
                    fill="currentColor"
                />
                <g className="sun-beams" stroke="currentColor">
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </g>
            </svg>
            <style>{`
                .theme-toggle {
                    background: none;
                    border: none;
                    padding: 0;
                    cursor: pointer;
                    touch-action: manipulation;
                    -webkit-tap-highlight-color: transparent;
                    outline-offset: 5px;
                    color: var(--toggle-color, #4b5563); 
                }
                
                :root[class="dark"] .theme-toggle {
                    --toggle-color: #d1d5db;
                }

                .theme-toggle:hover {
                    color: var(--toggle-hover, #111827);
                }
                :root[class="dark"] .theme-toggle:hover {
                    --toggle-hover: #f3f4f6;
                }

                .sun-and-moon > :is(.moon, .sun, .sun-beams) {
                    transform-origin: center center;
                }

                .sun-and-moon > :is(.moon, .sun) {
                    fill: currentColor;
                }

                .theme-toggle:is(:hover, :focus-visible) > .sun-and-moon > :is(.moon, .sun) {
                    fill: currentColor;
                }

                .sun-and-moon > .sun-beams {
                    stroke: currentColor;
                    stroke-width: 2px;
                }

                /* Light Mode (Default) */
                .sun-and-moon > .sun {
                    transform: scale(1);
                    transition: transform .3s cubic-bezier(.5, 1.25, .75, 1.25); 
                }

                .sun-and-moon > .sun-beams {
                    opacity: 1;
                    transform: rotate(0deg);
                    transition: transform .3s cubic-bezier(.5, 1.5, .75, 1.25), opacity .3s cubic-bezier(.25, 0, .3, 1);
                }

                .sun-and-moon .moon > circle {
                    transform: translateX(-7px);
                    transition: transform .25s cubic-bezier(0, 0, 0, 1);
                }

                /* Dark Mode */
                :root[class="dark"] .sun-and-moon > .sun {
                    transform: scale(1.75);
                    transition-timing-function: cubic-bezier(.25, 0, .3, 1);
                    transition-duration: .25s;
                }

                :root[class="dark"] .sun-and-moon > .sun-beams {
                    transform: rotate(-25deg);
                    opacity: 0;
                    transition-duration: .15s;
                }

                :root[class="dark"] .sun-and-moon .moon > circle {
                    transform: translateX(-14px); /* Moves mask into view to create crescent */
                    transition-delay: .1s;
                    transition-duration: .3s;
                }
            `}</style>
        </button>
    );
}
