import { ConnectWallet, Navigation } from '@/components/shared';
import { Link } from 'react-router-dom';


const Topbar = () => {
    return (
        <header className="border-b border-white/[0.1]">
        <div className="container-main py-6 flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-xl font-bold text-white hover:text-gray-300 transition-colors">
              Tundra
            </Link>
            <Navigation />
          </div>
          <div className="flex items-center space-x-4">
            <a
              href="https://docs.tundra.co.nz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </a>
            <ConnectWallet />
          </div>
        </div>
      </header>
    )
}

export default Topbar