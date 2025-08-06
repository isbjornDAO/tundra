import { useTheme } from 'next-themes';
import { FaSun, FaMoon } from 'react-icons/fa6';

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    return (
        <button
            onClick={toggleTheme}
            className="theme-toggle"
        >
            {theme === 'dark' ? <FaSun /> : <FaMoon />}
        </button>
    );
}

export default ThemeToggle;