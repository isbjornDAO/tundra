
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import App from './App'
import { AuthProvider } from "@/context/AuthContext";
import { Web3Provider } from '@/context/Web3Context';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ThemeProvider attribute="class" defaultTheme='light'>
    <Web3Provider>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </Web3Provider>
  </ThemeProvider>
)
