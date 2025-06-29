"use client";

import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";

export default function Home() {
  const { address, isConnected } = useAccount();
  const [currentView, setCurrentView] = useState("regions");

  // Global tournament phases
  const currentSeason = {
    phase: "Regional Planning", // Regional Planning -> Regional Events -> World Championship
    game: "CS2",
    seasonNumber: 1,
    worldChampionshipDate: "2024-12-15"
  };

  // Global organizer count and regional events
  const totalOrganizers = 47;
  const targetOrganizers = 50;
  
  const regionalEvents = [
    {
      id: 1,
      name: "North America",
      status: "Planning", // Planning -> Event Scheduled -> Event Complete
      eventDate: null,
      hasChampion: false,
      winner: null
    },
    {
      id: 2,
      name: "Europe",
      status: "Event Scheduled",
      eventDate: "2024-10-20",
      hasChampion: false,
      winner: null
    },
    {
      id: 3,
      name: "Asia Pacific",
      status: "Event Complete",
      eventDate: "2024-09-28",
      hasChampion: true,
      winner: "Team Dragons"
    },
    {
      id: 4,
      name: "South America",
      status: "Planning",
      eventDate: null,
      hasChampion: false,
      winner: null
    },
    {
      id: 5,
      name: "Africa & Middle East",
      status: "Planning", 
      eventDate: null,
      hasChampion: false,
      winner: null
    }
  ];

  const myInvolvement = [
    {
      role: "Global Tournament Organizer",
      joinedDate: "2024-06-15",
      status: "Active",
      contributedEvents: ["North America"]
    }
  ];

  const joinOrganizers = () => {
    alert(`Joined Team1 global organizing team with wallet: ${address}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-white text-red-600 px-3 py-1 rounded-lg font-bold text-xl">
                T1
              </div>
              <h1 className="text-2xl font-bold">Tournament Organizers</h1>
            </div>
            
            <div className="flex items-center gap-4">
              {isConnected && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentView("regions")}
                    className={`px-4 py-2 rounded ${
                      currentView === "regions" 
                        ? "bg-red-500 text-white" 
                        : "bg-white text-red-600"
                    }`}
                  >
                    Regional Events
                  </button>
                  <button
                    onClick={() => setCurrentView("my-involvement")}
                    className={`px-4 py-2 rounded ${
                      currentView === "my-involvement" 
                        ? "bg-red-500 text-white" 
                        : "bg-white text-red-600"
                    }`}
                  >
                    My Involvement
                  </button>
                </div>
              )}

              <ConnectButton.Custom>
                {({
                  account,
                  chain,
                  openAccountModal,
                  openChainModal,
                  openConnectModal,
                  authenticationStatus,
                  mounted,
                }) => {
                  const ready = mounted && authenticationStatus !== 'loading';
                  const connected =
                    ready &&
                    account &&
                    chain &&
                    (!authenticationStatus ||
                      authenticationStatus === 'authenticated');

                  return (
                    <div
                      {...(!ready && {
                        'aria-hidden': true,
                        'style': {
                          opacity: 0,
                          pointerEvents: 'none',
                          userSelect: 'none',
                        },
                      })}
                    >
                      {(() => {
                        if (!connected) {
                          return (
                            <button 
                              onClick={openConnectModal} 
                              className="bg-white text-red-600 px-4 py-2 rounded hover:bg-gray-100 font-semibold"
                            >
                              Connect Wallet
                            </button>
                          );
                        }

                        if (chain.unsupported) {
                          return (
                            <button 
                              onClick={openChainModal}
                              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                            >
                              Wrong network
                            </button>
                          );
                        }

                        return (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={openChainModal}
                              className="bg-white text-red-600 px-3 py-1 rounded text-sm hover:bg-gray-100"
                            >
                              {chain.hasIcon && (
                                <div
                                  className="w-4 h-4 rounded-full overflow-hidden mr-1 inline-block"
                                  style={{
                                    background: chain.iconBackground,
                                  }}
                                >
                                  {chain.iconUrl && (
                                    <img
                                      alt={chain.name ?? 'Chain icon'}
                                      src={chain.iconUrl}
                                      className="w-4 h-4"
                                    />
                                  )}
                                </div>
                              )}
                              {chain.name}
                            </button>

                            <button 
                              onClick={openAccountModal}
                              className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-900"
                            >
                              {account.displayName}
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  );
                }}
              </ConnectButton.Custom>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-8">
        {!isConnected && (
          <div className="text-center py-12">
            <div className="bg-white rounded-lg shadow-lg p-8 max-w-md mx-auto">
              <div className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-2xl mb-4 inline-block">
                TEAM1
              </div>
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">Tournament Organizer Portal</h2>
              <p className="text-gray-600 mb-6">Connect your wallet to register as a Team1 tournament organizer</p>
              <p className="text-sm text-gray-500">Register for regional game tournaments and compete with other organizers</p>
            </div>
          </div>
        )}

        {/* Season Overview */}
        {isConnected && (
          <div className="mb-8 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold mb-2">Team1 {currentSeason.game} World Championship Season {currentSeason.seasonNumber}</h2>
                <p className="text-red-100">Current Phase: <span className="font-semibold">{currentSeason.phase}</span></p>
                <p className="text-red-100">World Championship: {new Date(currentSeason.worldChampionshipDate).toLocaleDateString()}</p>
                <div className="mt-3">
                  <p className="text-red-100 text-sm">Global Organizers: {totalOrganizers}/{targetOrganizers}</p>
                  <div className="bg-red-800 rounded-full h-2 mt-1">
                    <div 
                      className="bg-white h-2 rounded-full transition-all duration-300" 
                      style={{width: `${(totalOrganizers / targetOrganizers) * 100}%`}}
                    />
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-white text-red-600 px-4 py-2 rounded-lg font-bold text-lg mb-2">
                  {currentSeason.phase}
                </div>
                {totalOrganizers < targetOrganizers && (
                  <button 
                    onClick={joinOrganizers}
                    className="bg-white text-red-600 px-4 py-2 rounded text-sm hover:bg-gray-100 font-medium"
                  >
                    Join Organizing Team
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {currentView === "regions" && isConnected && (
          <div>
            <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-2 text-red-600">Regional Events Status</h2>
              <p className="text-gray-600">Track the progress of regional events being organized by our global team. Each region will crown a champion for the World Championship.</p>
            </div>
            
            <div className="grid gap-4">
              {regionalEvents.map((event) => (
                <div key={event.id} className="bg-white rounded-lg shadow-lg border-l-4 border-red-600 p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-semibold text-gray-800">{event.name}</h3>
                        <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-semibold">
                          TEAM1
                        </span>
                      </div>
                      
                      {event.eventDate && (
                        <p className="text-sm text-gray-600 mt-2">
                          📅 Event Date: {new Date(event.eventDate).toLocaleDateString()}
                        </p>
                      )}
                      
                      {event.hasChampion && event.winner && (
                        <div className="mt-3 p-3 bg-green-50 rounded">
                          <p className="text-sm font-semibold text-green-800">🏆 Regional Champion</p>
                          <p className="text-green-700">{event.winner}</p>
                        </div>
                      )}
                      
                      {!event.eventDate && event.status === "Planning" && (
                        <p className="text-sm text-gray-500 mt-2">
                          📋 Event planning in progress by global organizing team
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        event.status === "Event Complete" 
                          ? "bg-green-500 text-white"
                          : event.status === "Event Scheduled"
                          ? "bg-blue-500 text-white"
                          : "bg-yellow-500 text-white"
                      }`}>
                        {event.status}
                      </span>
                      
                      {event.hasChampion && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                          ✅ Qualified for Worlds
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentView === "my-involvement" && isConnected && (
          <div>
            <div className="mb-6 bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-red-600">My Team1 Involvement</h2>
              <p className="text-gray-600">Track your participation in the global organizing team and tournament coordination.</p>
            </div>
            
            {myInvolvement.length === 0 ? (
              <div className="text-center py-8">
                <div className="bg-white rounded-lg shadow-lg p-8">
                  <p className="text-gray-600">Not yet part of the global organizing team</p>
                  <p className="text-sm text-gray-500 mt-2">Join the Team1 organizing team to help coordinate regional events</p>
                  <button 
                    onClick={joinOrganizers}
                    className="mt-4 bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700 font-medium"
                  >
                    Join Global Organizing Team
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                {myInvolvement.map((involvement, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-lg border-l-4 border-red-600 p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold text-gray-800">{involvement.role}</h3>
                          <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-semibold">
                            TEAM1
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                          Joined: {new Date(involvement.joinedDate).toLocaleDateString()}
                        </p>
                        
                        {involvement.contributedEvents && involvement.contributedEvents.length > 0 && (
                          <div className="mt-3 p-3 bg-gray-50 rounded">
                            <p className="text-sm font-medium text-gray-700">Contributing to events:</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {involvement.contributedEvents.map((event, i) => (
                                <span key={i} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                  {event}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        involvement.status === "Active" 
                          ? "bg-green-500 text-white" 
                          : "bg-gray-500 text-white"
                      }`}>
                        {involvement.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* World Championship Progress */}
            <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-semibold mb-4 text-red-600">World Championship Progress</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded">
                  <p className="text-2xl font-bold text-gray-800">{regionalEvents.filter(e => e.status === "Event Complete").length}</p>
                  <p className="text-sm text-gray-600">Regions Complete</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded">
                  <p className="text-2xl font-bold text-gray-800">{regionalEvents.filter(e => e.hasChampion).length}</p>
                  <p className="text-sm text-gray-600">Champions Crowned</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded">
                  <p className="text-2xl font-bold text-gray-800">{regionalEvents.length}</p>
                  <p className="text-sm text-gray-600">Total Regions</p>
                </div>
              </div>
              
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Overall Progress to World Championship</p>
                <div className="bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-gradient-to-r from-red-500 to-red-600 h-4 rounded-full transition-all duration-500" 
                    style={{width: `${(regionalEvents.filter(e => e.hasChampion).length / regionalEvents.length) * 100}%`}}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {regionalEvents.filter(e => e.hasChampion).length} of {regionalEvents.length} regional champions qualified
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
